# Multi-Metric Correlation Analysis

## Overview

The wellness log application now supports comprehensive correlation analysis between lifestyle factors and **all wellbeing metrics**, not just mood scores.

## Wellbeing Metrics Analyzed

The following metrics are now included in correlation analysis:

1. **Mood Score** (1-5 scale, higher is better)
2. **Energy Level** (1-5 scale, higher is better)
3. **Stress Level** (0-3 scale, lower is better)
4. **Anxiety Level** (0-3 scale, lower is better)
5. **Rumination Level** (0-3 scale, lower is better)
6. **Anger Level** (0-3 scale, lower is better)
7. **General Health** (0-5 scale, higher is better)
8. **Sleep Quality** (0-3 scale, higher is better)
9. **Sweating Level** (0-3 scale, lower is better)
10. **Libido Level** (0-3 scale, higher is better)

## Correlation Algorithm: Pearson Correlation

### Why Pearson Correlation?

We use **Pearson's correlation coefficient** (Pearson's r) for this analysis because:

1. **Linear Relationship Detection**: It measures the strength and direction of linear relationships between two continuous variables
2. **Statistical Significance**: Provides p-values to determine if correlations are statistically significant (p < 0.05)
3. **Interpretability**: Results range from -1 to +1, making them easy to understand:
   - +1 = perfect positive correlation
   - 0 = no correlation
   - -1 = perfect negative correlation
4. **Widely Understood**: Standard method in scientific research, making results relatable
5. **Appropriate for Binary/Continuous Pairs**: Works well for our use case where lifestyle factors are binary (completed/not completed) and wellbeing metrics are continuous

### Statistical Significance

- **Threshold**: p-value < 0.05
- **Minimum Samples**: 7 days (configurable)
- **Significance Meaning**: Less than 5% probability that the correlation occurred by chance

### Interpretation Guidelines

The app interprets correlations contextually based on whether "higher is better" for each metric:

#### For Positive Metrics (Mood, Energy, Health, etc.)
- **Positive correlation** = Beneficial (completing the lifestyle factor is associated with better outcomes)
- **Negative correlation** = Detrimental (completing the lifestyle factor is associated with worse outcomes)

#### For Negative Metrics (Stress, Anxiety, Sweating, etc.)
- **Negative correlation** = Beneficial (completing the lifestyle factor is associated with reduced stress/anxiety/etc.)
- **Positive correlation** = Detrimental (completing the lifestyle factor is associated with increased stress/anxiety/etc.)

## API Endpoints

### New Endpoints

#### 1. Multi-Metric Correlations

```
GET /api/analytics/correlations/multi-metric
```

**Query Parameters:**
- `start_date` (optional): Start date for analysis (YYYY-MM-DD)
- `end_date` (optional): End date for analysis (YYYY-MM-DD)
- `min_samples` (optional): Minimum number of samples required (default: 7)
- `metric` (optional): Filter to specific metric (e.g., "mood_score")

**Response:**
```json
{
  "by_metric": [
    {
      "metric_name": "mood_score",
      "metric_display_name": "Mood Score",
      "correlations": [
        {
          "lifestyle_factor_name": "Exercise",
          "lifestyle_factor_id": 1,
          "metric_name": "mood_score",
          "correlation": 0.756,
          "p_value": 0.0012,
          "significant": true,
          "sample_size": 42
        }
      ]
    }
  ],
  "by_lifestyle_factor": {
    "1": [
      {
        "lifestyle_factor_name": "Exercise",
        "lifestyle_factor_id": 1,
        "metric_name": "mood_score",
        "correlation": 0.756,
        "p_value": 0.0012,
        "significant": true,
        "sample_size": 42
      }
    ]
  }
}
```

#### 2. Enhanced Correlation Details

```
GET /api/analytics/correlations/{lifestyle_factor_id}
```

**Query Parameters:**
- `start_date` (optional): Start date for analysis
- `end_date` (optional): End date for analysis
- `metric` (optional): Specific metric to analyze (default: "mood_score")

**Response:**
```json
{
  "lifestyle_factor_name": "Exercise",
  "metric_name": "mood_score",
  "metric_display_name": "Mood Score",
  "correlations": {
    "same_day": {
      "correlation": 0.756,
      "p_value": 0.0012,
      "samples": 42
    },
    "next_day": {
      "correlation": 0.623,
      "p_value": 0.0045,
      "samples": 41
    },
    "two_days": {
      "correlation": 0.412,
      "p_value": 0.0123,
      "samples": 40
    }
  },
  "data_points": [
    {
      "date": "2024-01-15",
      "completed": true,
      "value": 4.5
    }
  ]
}
```

#### 3. Wellbeing Trends (All Metrics)

```
GET /api/analytics/trends/wellbeing
```

**Query Parameters:**
- `start_date` (optional): Start date for trends
- `end_date` (optional): End date for trends

**Response:**
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "mood_score": 4.2,
      "mood_score_ma7": 4.1,
      "energy_level": 3.8,
      "energy_level_ma7": 3.7,
      "stress_level": 1.2,
      "stress_level_ma7": 1.3,
      ...
    }
  ]
}
```

### Legacy Endpoints (Maintained for Backward Compatibility)

- `GET /api/analytics/correlations` - Returns only mood_score correlations
- `GET /api/analytics/trends/mood` - Returns only mood, energy, and stress trends

## Frontend Components

### 1. MultiMetricCorrelationChart

New component that displays correlations across all wellbeing metrics.

**Features:**
- Metric selector to switch between different wellbeing metrics
- Horizontal bar chart showing correlations
- Color coding based on effect (beneficial/detrimental)
- Contextual interpretation based on metric type
- Detailed correlation list with statistical information
- Legend and interpretation guide

**Location:** `frontend/src/components/MultiMetricCorrelationChart.tsx`

### 2. Updated Analytics Page

**Features:**
- View mode toggle: "All Metrics" vs "Mood Only (Legacy)"
- Multi-metric correlation visualization
- Enhanced insights showing top correlations across all metrics
- Improved educational content

**Location:** `frontend/src/pages/Analytics.tsx`

## Color Coding System

The visualization uses intelligent color coding that accounts for metric directionality:

- 🟢 **Green** - Strong beneficial effect
- 🔵 **Blue** - Moderate beneficial effect
- 🟡 **Yellow** - Weak/neutral effect
- 🟠 **Orange** - Moderate detrimental effect
- 🔴 **Red** - Strong detrimental effect
- ⚪ **Gray** - Not statistically significant

## Data Processing

### Handling Missing Data

- Days without lifestyle factor entries are treated as "not completed" (0)
- Days without wellbeing metric values are excluded from that metric's analysis
- Each metric is analyzed independently with its available data

### Daily Aggregation

- Multiple wellbeing entries on the same day are averaged
- Lifestyle factors are binary per day (completed/not completed)

### Minimum Requirements

- At least 7 days of data (configurable)
- At least 2 unique values for both variables (prevents division by zero)
- Non-zero standard deviation for both variables

## Usage Examples

### Finding What Affects Your Sleep

1. Navigate to Analytics page
2. Select desired time period (30d, 60d, etc.)
3. Click "All Metrics" view
4. Select "Sleep Quality" from metric buttons
5. Review correlations to see which lifestyle factors correlate with better/worse sleep

### Understanding Stress Triggers

1. Go to Analytics
2. Select appropriate time range
3. Choose "Stress Level" metric
4. Look for positive correlations (these indicate factors that increase stress)
5. Look for negative correlations (these indicate factors that reduce stress)

### Comparing Effects Across Metrics

1. Select a lifestyle factor from the correlation list
2. Note its correlation with one metric
3. Switch to different metrics to see how the same lifestyle factor affects different aspects of wellbeing

## Important Notes

### Correlation ≠ Causation

The app prominently displays this warning. Correlations show **associations**, not necessarily **cause-and-effect relationships**. Factors to consider:

- **Reverse causation**: Better mood might lead to more exercise, not just exercise leading to better mood
- **Confounding variables**: Other factors might influence both the lifestyle factor and wellbeing metric
- **Time lag effects**: The app checks same-day, next-day, and two-day lag correlations to help identify temporal patterns

### Statistical Significance

- A "significant" correlation (p < 0.05) means the relationship is unlikely to be random
- However, with many comparisons, some false positives are expected
- Larger sample sizes provide more reliable results
- Consider the practical significance (effect size) not just statistical significance

### Interpretation Context

The app automatically interprets correlations based on:
- Whether higher values are better or worse for each metric
- The strength of the correlation (weak, moderate, strong)
- Statistical significance

## Technical Implementation

### Backend (`analytics.py`)

**Key Functions:**
- `get_multi_metric_correlations()`: Main function for multi-metric analysis
- `get_lifestyle_factor_correlation_details()`: Enhanced with metric parameter
- `get_wellbeing_trends()`: New function for all-metric trends

**Data Structure:**
- `WELLBEING_METRICS` dictionary defines all metrics with metadata
- Pearson correlation calculated using `scipy.stats.pearsonr()`
- Extensive error handling for edge cases (NaN, infinite values, etc.)

### Frontend

**Type Definitions (`api.ts`):**
- `CorrelationResult`: Enhanced with `metric_name` field
- `MetricCorrelationSummary`: Groups correlations by metric
- `MultiMetricCorrelationResult`: Complete response structure

**Components:**
- `MultiMetricCorrelationChart`: Primary visualization component
- `Analytics`: Updated page with view mode toggle

## Future Enhancements

Possible improvements for future versions:

1. **Machine Learning Models**: Use regression or decision trees to better capture non-linear relationships
2. **Multivariate Analysis**: Examine combinations of lifestyle factors
3. **Personalized Recommendations**: AI-driven suggestions based on correlation patterns
4. **Time Series Analysis**: More sophisticated temporal pattern detection
5. **Clustering**: Group similar days or patterns
6. **Export Functionality**: Allow users to export correlation reports
7. **Mobile-Optimized Views**: Better responsive design for correlation visualizations

## Testing

To test the new functionality:

1. Ensure you have at least 7 days of data with both lifestyle factor entries and wellbeing metrics
2. Navigate to the Analytics page
3. Try switching between different metrics
4. Verify colors and interpretations make sense
5. Check that non-significant correlations are displayed in gray
6. Test different time ranges

## Migration Notes

- **No database changes required**: Uses existing tables
- **Backward compatible**: Legacy endpoints still work
- **Gradual adoption**: Users can toggle between old and new views
- **No breaking changes**: Existing API clients continue to work

