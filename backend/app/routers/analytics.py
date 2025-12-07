from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import date, timedelta
import pandas as pd
from scipy import stats
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.get("/correlations", response_model=List[schemas.CorrelationResult])
def get_habit_mood_correlations(
    start_date: date = None,
    end_date: date = None,
    min_samples: int = 7,
    db: Session = Depends(get_db)
):
    """
    Calculate correlations between habits and mood scores.
    Returns correlation coefficient, p-value, and significance for each habit.
    """
    # Get all habits (including archived ones for historical data)
    habits = db.query(models.Habit).all()
    
    if not habits:
        return []
    
    # Get mood entries
    mood_query = db.query(models.MoodEntry)
    if start_date:
        mood_query = mood_query.filter(models.MoodEntry.date >= start_date)
    if end_date:
        mood_query = mood_query.filter(models.MoodEntry.date <= end_date)
    
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
    
    for habit in habits:
        # Get habit entries
        habit_query = db.query(models.HabitEntry).filter(
            models.HabitEntry.habit_id == habit.id
        )
        if start_date:
            habit_query = habit_query.filter(models.HabitEntry.date >= start_date)
        if end_date:
            habit_query = habit_query.filter(models.HabitEntry.date <= end_date)
        
        habit_entries = habit_query.all()
        
        if not habit_entries:
            continue
        
        # Create DataFrame with habit completion
        habit_df = pd.DataFrame([
            {"date": entry.date, "completed": 1 if entry.completed else 0}
            for entry in habit_entries
        ])
        
        # Merge mood and habit data
        # Use LEFT join to include all mood tracking days
        # Days without habit entries are treated as not completed (0)
        merged_df = pd.merge(mood_df, habit_df, on="date", how="left")
        merged_df["completed"] = merged_df["completed"].fillna(0)
        
        # Need minimum number of samples for meaningful correlation
        if len(merged_df) < min_samples:
            continue
        
        # Calculate Pearson correlation
        correlation, p_value = stats.pearsonr(
            merged_df["completed"],
            merged_df["mood_score"]
        )
        
        # Consider significant if p-value < 0.05
        significant = p_value < 0.05
        
        results.append(schemas.CorrelationResult(
            habit_name=habit.name,
            habit_id=habit.id,
            correlation=round(correlation, 3),
            p_value=round(p_value, 4),
            significant=significant,
            sample_size=len(merged_df)
        ))
    
    # Sort by absolute correlation value
    results.sort(key=lambda x: abs(x.correlation), reverse=True)
    
    return results

@router.get("/correlations/health-aspects")
def get_habit_health_aspect_correlations(
    aspect_id: int = None,
    start_date: date = None,
    end_date: date = None,
    min_samples: int = 7,
    db: Session = Depends(get_db)
):
    """
    Calculate correlations between habits and health aspects.
    Shows which habits/supplements correlate with health indicators.
    """
    # Get health aspects
    aspect_query = db.query(models.HealthAspect).filter(models.HealthAspect.is_active == True)
    if aspect_id:
        aspect_query = aspect_query.filter(models.HealthAspect.id == aspect_id)
    aspects = aspect_query.all()
    
    if not aspects:
        return {"results": []}
    
    # Get all habits (including archived ones for historical data)
    habits = db.query(models.Habit).all()
    
    if not habits:
        return {"results": []}
    
    results = []
    
    for aspect in aspects:
        # Get health aspect entries
        aspect_entries_query = db.query(models.HealthAspectEntry).filter(
            models.HealthAspectEntry.aspect_id == aspect.id
        )
        if start_date:
            aspect_entries_query = aspect_entries_query.filter(models.HealthAspectEntry.date >= start_date)
        if end_date:
            aspect_entries_query = aspect_entries_query.filter(models.HealthAspectEntry.date <= end_date)
        
        aspect_entries = aspect_entries_query.all()
        
        if not aspect_entries:
            results.append({
                "aspect_id": aspect.id,
                "aspect_name": aspect.name,
                "aspect_category": aspect.category,
                "is_positive": bool(aspect.is_positive),
                "correlations": []
            })
            continue
        
        # Create DataFrame with aspect severity
        aspect_df = pd.DataFrame([
            {"date": entry.date, "severity": entry.severity}
            for entry in aspect_entries
        ])
        
        # Group by date and take mean (in case duplicates)
        aspect_df = aspect_df.groupby("date").agg({"severity": "mean"}).reset_index()
        
        aspect_correlations = []
        
        for habit in habits:
            # Get habit entries
            habit_query = db.query(models.HabitEntry).filter(
                models.HabitEntry.habit_id == habit.id
            )
            if start_date:
                habit_query = habit_query.filter(models.HabitEntry.date >= start_date)
            if end_date:
                habit_query = habit_query.filter(models.HabitEntry.date <= end_date)
            
            habit_entries = habit_query.all()
            
            if not habit_entries:
                continue
            
            # Create DataFrame with habit completion
            habit_df = pd.DataFrame([
                {"date": entry.date, "completed": 1 if entry.completed else 0}
                for entry in habit_entries
            ])
            
            # Merge aspect and habit data
            # Use LEFT join to include all health aspect tracking days
            # Days without habit entries are treated as not completed (0)
            merged_df = pd.merge(aspect_df, habit_df, on="date", how="left")
            merged_df["completed"] = merged_df["completed"].fillna(0)
            
            # Need minimum number of samples
            if len(merged_df) < min_samples:
                continue
            
            # Skip if no variation in either variable (needed for correlation)
            if merged_df["severity"].nunique() < 2 or merged_df["completed"].nunique() < 2:
                continue
            
            # Calculate Pearson correlation
            try:
                correlation, p_value = stats.pearsonr(
                    merged_df["completed"],
                    merged_df["severity"]
                )
                
                # Skip if correlation is NaN or infinite
                if not pd.notna(correlation) or not pd.notna(p_value):
                    continue
                if not (-1 <= correlation <= 1):
                    continue
                
                significant = p_value < 0.05
                
                aspect_correlations.append({
                    "habit_id": habit.id,
                    "habit_name": habit.name,
                    "habit_category": habit.category,
                    "correlation": round(float(correlation), 3),
                    "p_value": round(float(p_value), 4),
                    "significant": bool(significant),
                    "sample_size": int(len(merged_df))
                })
            except Exception as e:
                # Silently skip errors in correlation calculation
                continue
        
        # Sort by absolute correlation value
        aspect_correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        
        results.append({
            "aspect_id": aspect.id,
            "aspect_name": aspect.name,
            "aspect_category": aspect.category,
            "is_positive": bool(aspect.is_positive),
            "correlations": aspect_correlations[:20]  # Top 20 correlations
        })
    
    return {"results": results}

@router.get("/correlations/{habit_id}")
def get_habit_correlation_details(
    habit_id: int,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db)
):
    """
    Get detailed correlation data for a specific habit including time-lagged correlations.
    This can show if completing a habit today affects mood tomorrow or later.
    """
    habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Get mood entries
    mood_query = db.query(models.MoodEntry)
    if start_date:
        mood_query = mood_query.filter(models.MoodEntry.date >= start_date)
    if end_date:
        mood_query = mood_query.filter(models.MoodEntry.date <= end_date)
    
    mood_entries = mood_query.all()
    
    # Get habit entries
    habit_query = db.query(models.HabitEntry).filter(
        models.HabitEntry.habit_id == habit_id
    )
    if start_date:
        habit_query = habit_query.filter(models.HabitEntry.date >= start_date)
    if end_date:
        habit_query = habit_query.filter(models.HabitEntry.date <= end_date)
    
    habit_entries = habit_query.all()
    
    if not mood_entries or not habit_entries:
        return {
            "habit_name": habit.name,
            "same_day": None,
            "next_day": None,
            "two_days": None,
            "data_points": []
        }
    
    # Create DataFrames
    mood_df = pd.DataFrame([
        {"date": entry.date, "mood_score": entry.mood_score}
        for entry in mood_entries
    ])
    mood_df = mood_df.groupby("date").agg({"mood_score": "mean"}).reset_index()
    
    habit_df = pd.DataFrame([
        {"date": entry.date, "completed": 1 if entry.completed else 0}
        for entry in habit_entries
    ])
    
    # Calculate correlations with different time lags
    correlations = {}
    
    # Same day correlation
    merged_same = pd.merge(mood_df, habit_df, on="date", how="left")
    merged_same["completed"] = merged_same["completed"].fillna(0)
    if len(merged_same) >= 5:
        corr, p_val = stats.pearsonr(merged_same["completed"], merged_same["mood_score"])
        correlations["same_day"] = {
            "correlation": round(corr, 3),
            "p_value": round(p_val, 4),
            "samples": len(merged_same)
        }
    
    # Next day correlation (habit today affects mood tomorrow)
    habit_df_lag1 = habit_df.copy()
    habit_df_lag1["date"] = habit_df_lag1["date"] + timedelta(days=1)
    merged_lag1 = pd.merge(mood_df, habit_df_lag1, on="date", how="left")
    merged_lag1["completed"] = merged_lag1["completed"].fillna(0)
    if len(merged_lag1) >= 5:
        corr, p_val = stats.pearsonr(merged_lag1["completed"], merged_lag1["mood_score"])
        correlations["next_day"] = {
            "correlation": round(corr, 3),
            "p_value": round(p_val, 4),
            "samples": len(merged_lag1)
        }
    
    # Two days later correlation
    habit_df_lag2 = habit_df.copy()
    habit_df_lag2["date"] = habit_df_lag2["date"] + timedelta(days=2)
    merged_lag2 = pd.merge(mood_df, habit_df_lag2, on="date", how="left")
    merged_lag2["completed"] = merged_lag2["completed"].fillna(0)
    if len(merged_lag2) >= 5:
        corr, p_val = stats.pearsonr(merged_lag2["completed"], merged_lag2["mood_score"])
        correlations["two_days"] = {
            "correlation": round(corr, 3),
            "p_value": round(p_val, 4),
            "samples": len(merged_lag2)
        }
    
    # Get data points for visualization
    merged_all = pd.merge(mood_df, habit_df, on="date", how="inner")
    data_points = [
        {
            "date": str(row["date"]),
            "completed": bool(row["completed"]),
            "mood_score": row["mood_score"]
        }
        for _, row in merged_all.iterrows()
    ]
    
    return {
        "habit_name": habit.name,
        "correlations": correlations,
        "data_points": data_points
    }

@router.get("/trends/mood")
def get_mood_trends(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db)
):
    """Get mood trends over time with daily averages"""
    query = db.query(models.MoodEntry)
    
    if start_date:
        query = query.filter(models.MoodEntry.date >= start_date)
    if end_date:
        query = query.filter(models.MoodEntry.date <= end_date)
    
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

@router.get("/heatmap/{habit_id}")
def get_habit_heatmap(
    habit_id: int,
    year: int = None,
    db: Session = Depends(get_db)
):
    """Get habit completion data for calendar heatmap visualization"""
    habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    from datetime import datetime
    if not year:
        year = datetime.now().year
    
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    
    entries = db.query(models.HabitEntry).filter(
        models.HabitEntry.habit_id == habit_id,
        models.HabitEntry.date >= start,
        models.HabitEntry.date <= end
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
        "habit_name": habit.name,
        "year": year,
        "data": data
    }

