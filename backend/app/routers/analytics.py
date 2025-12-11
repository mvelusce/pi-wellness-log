from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import date, timedelta
import pandas as pd
from scipy import stats
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

# Define wellbeing metrics with their properties
WELLBEING_METRICS = {
    "mood_score": {"display_name": "Mood Score", "higher_is_better": True, "required": True},
    "energy_level": {"display_name": "Energy Level", "higher_is_better": True, "required": False},
    "stress_level": {"display_name": "Stress Level", "higher_is_better": False, "required": False},
    "anxiety_level": {"display_name": "Anxiety Level", "higher_is_better": False, "required": False},
    "rumination_level": {"display_name": "Rumination Level", "higher_is_better": False, "required": False},
    "anger_level": {"display_name": "Anger Level", "higher_is_better": False, "required": False},
    "general_health": {"display_name": "General Health", "higher_is_better": True, "required": False},
    "sleep_quality": {"display_name": "Sleep Quality", "higher_is_better": True, "required": False},
    "sweating_level": {"display_name": "Sweating Level", "higher_is_better": False, "required": False},
    "libido_level": {"display_name": "Libido Level", "higher_is_better": True, "required": False},
}

@router.get("/correlations", response_model=List[schemas.CorrelationResult])
def get_lifestyle_factor_mood_correlations(
    start_date: date = None,
    end_date: date = None,
    min_samples: int = 7,
    db: Session = Depends(get_db)
):
    """
    Legacy endpoint: Calculate correlations between lifestyle factors and mood scores only.
    For multi-metric correlations, use /correlations/multi-metric endpoint.
    Returns correlation coefficient, p-value, and significance for each lifestyle factor.
    """
    # Get all lifestyle factors (including archived ones for historical data)
    lifestyle_factors = db.query(models.LifestyleFactor).all()
    
    if not lifestyle_factors:
        return []
    
    # Get mood entries
    mood_query = db.query(models.WellbeingMetricEntry)
    if start_date:
        mood_query = mood_query.filter(models.WellbeingMetricEntry.date >= start_date)
    if end_date:
        mood_query = mood_query.filter(models.WellbeingMetricEntry.date <= end_date)
    
    mood_entries = mood_query.all()
    
    if not mood_entries:
        return []
    
    # Create a DataFrame with daily average mood scores
    mood_df = pd.DataFrame([
        {"date": entry.date, "mood_score": entry.mood_score}
        for entry in mood_entries
    ])
    
    # Group by date and take average (in case multiple entries per day)
    mood_df = mood_df.groupby("date").agg({"mood_score": "mean"}).reset_index()
    
    results = []
    
    for lifestyle_factor in lifestyle_factors:
        # Get lifestyle factor entries
        lifestyle_factor_query = db.query(models.LifestyleFactorEntry).filter(
            models.LifestyleFactorEntry.lifestyle_factor_id == lifestyle_factor.id
        )
        if start_date:
            lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date >= start_date)
        if end_date:
            lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date <= end_date)
        
        lifestyle_factor_entries = lifestyle_factor_query.all()
        
        if not lifestyle_factor_entries:
            continue
        
        # Create DataFrame with lifestyle factor completion
        lifestyle_factor_df = pd.DataFrame([
            {"date": entry.date, "completed": 1 if entry.completed else 0}
            for entry in lifestyle_factor_entries
        ])
        
        # Merge mood and lifestyle factor data
        # Use LEFT join to include all mood tracking days
        # Days without lifestyle factor entries are treated as not completed (0)
        merged_df = pd.merge(mood_df, lifestyle_factor_df, on="date", how="left")
        merged_df["completed"] = merged_df["completed"].fillna(0)
        
        # Need minimum number of samples for meaningful correlation
        if len(merged_df) < min_samples:
            continue
        
        # Skip if no variation in either variable (needed for correlation)
        if merged_df["completed"].nunique() < 2 or merged_df["mood_score"].nunique() < 2:
            continue
        
        # Skip if all values are the same (would cause correlation error)
        if merged_df["completed"].std() == 0 or merged_df["mood_score"].std() == 0:
            continue
        
        # Calculate Pearson correlation
        try:
            correlation, p_value = stats.pearsonr(
                merged_df["completed"],
                merged_df["mood_score"]
            )
            
            # Skip if correlation is NaN or infinite
            if not pd.notna(correlation) or not pd.notna(p_value):
                continue
            if not pd.isfinite(correlation) or not pd.isfinite(p_value):
                continue
            if not (-1 <= correlation <= 1):
                continue
        except Exception:
            # Skip this lifestyle factor if correlation calculation fails
            continue
        
        # Consider significant if p-value < 0.05
        significant = p_value < 0.05
        
        results.append(schemas.CorrelationResult(
            lifestyle_factor_name=lifestyle_factor.name,
            lifestyle_factor_id=lifestyle_factor.id,
            metric_name="mood_score",
            correlation=round(correlation, 3),
            p_value=round(p_value, 4),
            significant=significant,
            sample_size=len(merged_df)
        ))
    
    # Sort by absolute correlation value
    results.sort(key=lambda x: abs(x.correlation), reverse=True)
    
    return results


@router.get("/correlations/multi-metric")
def get_multi_metric_correlations(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    min_samples: int = 7,
    metric: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Calculate correlations between lifestyle factors and ALL wellbeing metrics.
    
    Args:
        start_date: Start date for analysis
        end_date: End date for analysis
        min_samples: Minimum number of samples required for correlation
        metric: Optional filter to return only a specific metric (e.g., "mood_score")
    
    Returns:
        Correlations organized by metric and lifestyle factor
    """
    # Get all lifestyle factors (including archived ones for historical data)
    lifestyle_factors = db.query(models.LifestyleFactor).all()
    
    if not lifestyle_factors:
        return {"by_metric": [], "by_lifestyle_factor": {}}
    
    # Get wellbeing entries
    wellbeing_query = db.query(models.WellbeingMetricEntry)
    if start_date:
        wellbeing_query = wellbeing_query.filter(models.WellbeingMetricEntry.date >= start_date)
    if end_date:
        wellbeing_query = wellbeing_query.filter(models.WellbeingMetricEntry.date <= end_date)
    
    wellbeing_entries = wellbeing_query.all()
    
    if not wellbeing_entries:
        return {"by_metric": [], "by_lifestyle_factor": {}}
    
    # Filter metrics if specified
    metrics_to_analyze = {metric: WELLBEING_METRICS[metric]} if metric and metric in WELLBEING_METRICS else WELLBEING_METRICS
    
    # Create DataFrames for each metric
    metric_dataframes = {}
    for metric_name in metrics_to_analyze.keys():
        data = []
        for entry in wellbeing_entries:
            value = getattr(entry, metric_name, None)
            if value is not None:
                data.append({"date": entry.date, metric_name: value})
        
        if data:
            df = pd.DataFrame(data)
            # Group by date and take average (in case multiple entries per day)
            df = df.groupby("date").agg({metric_name: "mean"}).reset_index()
            metric_dataframes[metric_name] = df
    
    # Calculate correlations for each lifestyle factor and metric
    all_correlations = []
    by_lifestyle_factor = {}
    
    for lifestyle_factor in lifestyle_factors:
        # Get lifestyle factor entries
        lifestyle_factor_query = db.query(models.LifestyleFactorEntry).filter(
            models.LifestyleFactorEntry.lifestyle_factor_id == lifestyle_factor.id
        )
        if start_date:
            lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date >= start_date)
        if end_date:
            lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date <= end_date)
        
        lifestyle_factor_entries = lifestyle_factor_query.all()
        
        if not lifestyle_factor_entries:
            continue
        
        # Create DataFrame with lifestyle factor completion
        lifestyle_factor_df = pd.DataFrame([
            {"date": entry.date, "completed": 1 if entry.completed else 0}
            for entry in lifestyle_factor_entries
        ])
        
        lifestyle_factor_correlations = []
        
        # Calculate correlation for each metric
        for metric_name, metric_df in metric_dataframes.items():
            # Merge wellbeing and lifestyle factor data
            merged_df = pd.merge(metric_df, lifestyle_factor_df, on="date", how="left")
            merged_df["completed"] = merged_df["completed"].fillna(0)
            
            # Need minimum number of samples for meaningful correlation
            if len(merged_df) < min_samples:
                continue
            
            # Skip if no variation in either variable
            if merged_df["completed"].nunique() < 2 or merged_df[metric_name].nunique() < 2:
                continue
            
            # Skip if all values are the same
            if merged_df["completed"].std() == 0 or merged_df[metric_name].std() == 0:
                continue
            
            # Calculate Pearson correlation
            try:
                correlation, p_value = stats.pearsonr(
                    merged_df["completed"],
                    merged_df[metric_name]
                )
                
                # Skip if correlation is NaN or infinite
                if not pd.notna(correlation) or not pd.notna(p_value):
                    continue
                if not pd.isfinite(correlation) or not pd.isfinite(p_value):
                    continue
                if not (-1 <= correlation <= 1):
                    continue
            except Exception:
                # Skip if correlation calculation fails
                continue
            
            # Consider significant if p-value < 0.05
            significant = p_value < 0.05
            
            corr_result = schemas.CorrelationResult(
                lifestyle_factor_name=lifestyle_factor.name,
                lifestyle_factor_id=lifestyle_factor.id,
                metric_name=metric_name,
                correlation=round(correlation, 3),
                p_value=round(p_value, 4),
                significant=significant,
                sample_size=len(merged_df)
            )
            
            all_correlations.append(corr_result)
            lifestyle_factor_correlations.append(corr_result)
        
        if lifestyle_factor_correlations:
            by_lifestyle_factor[lifestyle_factor.id] = lifestyle_factor_correlations
    
    # Organize by metric
    by_metric = []
    for metric_name, metric_info in metrics_to_analyze.items():
        metric_correlations = [c for c in all_correlations if c.metric_name == metric_name]
        # Sort by absolute correlation value
        metric_correlations.sort(key=lambda x: abs(x.correlation), reverse=True)
        
        if metric_correlations:
            by_metric.append(schemas.MetricCorrelationSummary(
                metric_name=metric_name,
                metric_display_name=metric_info["display_name"],
                correlations=metric_correlations
            ))
    
    return {"by_metric": by_metric, "by_lifestyle_factor": by_lifestyle_factor}

@router.get("/correlations/{lifestyle_factor_id}")
def get_lifestyle_factor_correlation_details(
    lifestyle_factor_id: int,
    start_date: date = None,
    end_date: date = None,
    metric: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get detailed correlation data for a specific lifestyle factor including time-lagged correlations.
    This can show if completing a lifestyle factor today affects wellbeing tomorrow or later.
    
    Args:
        lifestyle_factor_id: The lifestyle factor to analyze
        metric: Specific metric to analyze (default: mood_score for backward compatibility)
        start_date: Start date for analysis
        end_date: End date for analysis
    """
    lifestyle_factor = db.query(models.LifestyleFactor).filter(models.LifestyleFactor.id == lifestyle_factor_id).first()
    if not lifestyle_factor:
        raise HTTPException(status_code=404, detail="Lifestyle factor not found")
    
    # Default to mood_score for backward compatibility
    if not metric:
        metric = "mood_score"
    
    if metric not in WELLBEING_METRICS:
        raise HTTPException(status_code=400, detail=f"Invalid metric: {metric}")
    
    # Get wellbeing entries
    wellbeing_query = db.query(models.WellbeingMetricEntry)
    if start_date:
        wellbeing_query = wellbeing_query.filter(models.WellbeingMetricEntry.date >= start_date)
    if end_date:
        wellbeing_query = wellbeing_query.filter(models.WellbeingMetricEntry.date <= end_date)
    
    wellbeing_entries = wellbeing_query.all()
    
    # Get lifestyle factor entries
    lifestyle_factor_query = db.query(models.LifestyleFactorEntry).filter(
        models.LifestyleFactorEntry.lifestyle_factor_id == lifestyle_factor_id
    )
    if start_date:
        lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date >= start_date)
    if end_date:
        lifestyle_factor_query = lifestyle_factor_query.filter(models.LifestyleFactorEntry.date <= end_date)
    
    lifestyle_factor_entries = lifestyle_factor_query.all()
    
    if not wellbeing_entries or not lifestyle_factor_entries:
        return {
            "lifestyle_factor_name": lifestyle_factor.name,
            "metric_name": metric,
            "metric_display_name": WELLBEING_METRICS[metric]["display_name"],
            "same_day": None,
            "next_day": None,
            "two_days": None,
            "data_points": []
        }
    
    # Create DataFrames
    metric_data = []
    for entry in wellbeing_entries:
        value = getattr(entry, metric, None)
        if value is not None:
            metric_data.append({"date": entry.date, metric: value})
    
    if not metric_data:
        return {
            "lifestyle_factor_name": lifestyle_factor.name,
            "metric_name": metric,
            "metric_display_name": WELLBEING_METRICS[metric]["display_name"],
            "same_day": None,
            "next_day": None,
            "two_days": None,
            "data_points": []
        }
    
    metric_df = pd.DataFrame(metric_data)
    metric_df = metric_df.groupby("date").agg({metric: "mean"}).reset_index()
    
    lifestyle_factor_df = pd.DataFrame([
        {"date": entry.date, "completed": 1 if entry.completed else 0}
        for entry in lifestyle_factor_entries
    ])
    
    # Calculate correlations with different time lags
    correlations = {}
    
    # Same day correlation
    merged_same = pd.merge(metric_df, lifestyle_factor_df, on="date", how="left")
    merged_same["completed"] = merged_same["completed"].fillna(0)
    if len(merged_same) >= 5 and merged_same["completed"].nunique() >= 2 and merged_same[metric].nunique() >= 2:
        try:
            corr, p_val = stats.pearsonr(merged_same["completed"], merged_same[metric])
            if pd.notna(corr) and pd.notna(p_val) and pd.isfinite(corr) and pd.isfinite(p_val):
                correlations["same_day"] = {
                    "correlation": round(corr, 3),
                    "p_value": round(p_val, 4),
                    "samples": len(merged_same)
                }
        except:
            pass
    
    # Next day correlation (lifestyle factor today affects metric tomorrow)
    lifestyle_factor_df_lag1 = lifestyle_factor_df.copy()
    lifestyle_factor_df_lag1["date"] = lifestyle_factor_df_lag1["date"] + timedelta(days=1)
    merged_lag1 = pd.merge(metric_df, lifestyle_factor_df_lag1, on="date", how="left")
    merged_lag1["completed"] = merged_lag1["completed"].fillna(0)
    if len(merged_lag1) >= 5 and merged_lag1["completed"].nunique() >= 2 and merged_lag1[metric].nunique() >= 2:
        try:
            corr, p_val = stats.pearsonr(merged_lag1["completed"], merged_lag1[metric])
            if pd.notna(corr) and pd.notna(p_val) and pd.isfinite(corr) and pd.isfinite(p_val):
                correlations["next_day"] = {
                    "correlation": round(corr, 3),
                    "p_value": round(p_val, 4),
                    "samples": len(merged_lag1)
                }
        except:
            pass
    
    # Two days later correlation
    lifestyle_factor_df_lag2 = lifestyle_factor_df.copy()
    lifestyle_factor_df_lag2["date"] = lifestyle_factor_df_lag2["date"] + timedelta(days=2)
    merged_lag2 = pd.merge(metric_df, lifestyle_factor_df_lag2, on="date", how="left")
    merged_lag2["completed"] = merged_lag2["completed"].fillna(0)
    if len(merged_lag2) >= 5 and merged_lag2["completed"].nunique() >= 2 and merged_lag2[metric].nunique() >= 2:
        try:
            corr, p_val = stats.pearsonr(merged_lag2["completed"], merged_lag2[metric])
            if pd.notna(corr) and pd.notna(p_val) and pd.isfinite(corr) and pd.isfinite(p_val):
                correlations["two_days"] = {
                    "correlation": round(corr, 3),
                    "p_value": round(p_val, 4),
                    "samples": len(merged_lag2)
                }
        except:
            pass
    
    # Get data points for visualization
    merged_all = pd.merge(metric_df, lifestyle_factor_df, on="date", how="inner")
    data_points = [
        {
            "date": str(row["date"]),
            "completed": bool(row["completed"]),
            "value": row[metric]
        }
        for _, row in merged_all.iterrows()
    ]
    
    return {
        "lifestyle_factor_name": lifestyle_factor.name,
        "metric_name": metric,
        "metric_display_name": WELLBEING_METRICS[metric]["display_name"],
        "correlations": correlations,
        "data_points": data_points
    }

@router.get("/trends/mood")
def get_mood_trends(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db)
):
    """
    Legacy endpoint: Get mood trends over time with daily averages.
    For backward compatibility. Use /trends/wellbeing for all metrics.
    """
    query = db.query(models.WellbeingMetricEntry)
    
    if start_date:
        query = query.filter(models.WellbeingMetricEntry.date >= start_date)
    if end_date:
        query = query.filter(models.WellbeingMetricEntry.date <= end_date)
    
    entries = query.all()
    
    if not entries:
        return {"data": []}
    
    # Create DataFrame and aggregate by date
    df = pd.DataFrame([
        {
            "date": entry.date,
            "mood_score": entry.mood_score,
            "energy_level": entry.energy_level,
            "stress_level": entry.stress_level
        }
        for entry in entries
    ])
    
    daily_avg = df.groupby("date").agg({
        "mood_score": "mean",
        "energy_level": "mean",
        "stress_level": "mean"
    }).reset_index()
    
    # Calculate 7-day moving average
    daily_avg["mood_ma7"] = daily_avg["mood_score"].rolling(window=7, min_periods=1).mean()
    
    data = [
        {
            "date": str(row["date"]),
            "mood_score": round(row["mood_score"], 2),
            "mood_ma7": round(row["mood_ma7"], 2),
            "energy_level": round(row["energy_level"], 2) if pd.notna(row["energy_level"]) else None,
            "stress_level": round(row["stress_level"], 2) if pd.notna(row["stress_level"]) else None
        }
        for _, row in daily_avg.iterrows()
    ]
    
    return {"data": data}


@router.get("/trends/wellbeing")
def get_wellbeing_trends(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Get wellbeing trends over time with daily averages for all metrics.
    Includes 7-day moving averages for smoothed visualization.
    """
    query = db.query(models.WellbeingMetricEntry)
    
    if start_date:
        query = query.filter(models.WellbeingMetricEntry.date >= start_date)
    if end_date:
        query = query.filter(models.WellbeingMetricEntry.date <= end_date)
    
    entries = query.all()
    
    if not entries:
        return {"data": []}
    
    # Create DataFrame with all metrics
    data_records = []
    for entry in entries:
        record = {"date": entry.date}
        for metric_name in WELLBEING_METRICS.keys():
            value = getattr(entry, metric_name, None)
            record[metric_name] = value
        data_records.append(record)
    
    df = pd.DataFrame(data_records)
    
    # Group by date and calculate mean
    agg_dict = {metric: "mean" for metric in WELLBEING_METRICS.keys()}
    daily_avg = df.groupby("date").agg(agg_dict).reset_index()
    
    # Calculate 7-day moving averages for each metric
    for metric in WELLBEING_METRICS.keys():
        daily_avg[f"{metric}_ma7"] = daily_avg[metric].rolling(window=7, min_periods=1).mean()
    
    # Convert to output format
    data = []
    for _, row in daily_avg.iterrows():
        record = {"date": str(row["date"])}
        for metric in WELLBEING_METRICS.keys():
            value = row[metric]
            ma_value = row[f"{metric}_ma7"]
            record[metric] = round(value, 2) if pd.notna(value) else None
            record[f"{metric}_ma7"] = round(ma_value, 2) if pd.notna(ma_value) else None
        data.append(record)
    
    return {"data": data}

@router.get("/heatmap/{lifestyle_factor_id}")
def get_lifestyle_factor_heatmap(
    lifestyle_factor_id: int,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Get lifestyle factor completion data for calendar heatmap visualization"""
    lifestyle_factor = db.query(models.LifestyleFactor).filter(models.LifestyleFactor.id == lifestyle_factor_id).first()
    if not lifestyle_factor:
        raise HTTPException(status_code=404, detail="Lifestyle factor not found")
    
    from datetime import datetime
    if not year:
        year = datetime.now().year
    
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    
    entries = db.query(models.LifestyleFactorEntry).filter(
        models.LifestyleFactorEntry.lifestyle_factor_id == lifestyle_factor_id,
        models.LifestyleFactorEntry.date >= start,
        models.LifestyleFactorEntry.date <= end
    ).all()
    
    data = [
        {
            "date": str(entry.date),
            "completed": entry.completed,
            "value": 1 if entry.completed else 0
        }
        for entry in entries
    ]
    
    return {
        "lifestyle_factor_name": lifestyle_factor.name,
        "year": year,
        "data": data
    }

