# Health Aspects Tracking System

## Overview

The Health Aspects feature allows you to track physical and mental health indicators separately from habits. This enables you to analyze correlations between **what you do** (habits like taking supplements, eating certain foods, exercising) and **how you feel** (health aspects like sleep quality, anxiety, sickness, etc.).

## What Was Migrated

The following 12 items were migrated from habits to health aspects with **487 historical entries preserved**:

### Sleep (2 aspects)
- 😴 **Good sleep** (positive indicator) - 272 entries
- 😪 **Bad sleep** - 16 entries

### Mental Health (5 aspects)
- 🌀 **Rumination** - 6 entries
- 😠 **Anger** - 6 entries
- 😔 **Pessimism** - 4 entries
- 🌫️ **Mental fog** - 3 entries
- 😰 **Anxiety** - 22 entries

### Physical Health (5 aspects)
- 🤒 **Sickness** - 34 entries
- 💦 **Sweat problems** - 49 entries
- ⚠️ **ED** - 12 entries
- ⚠️ **MME** - 52 entries
- ⚠️ **Soft** - 11 entries

## Key Differences: Habits vs Health Aspects

### Habits
- **Purpose**: Track actions you take (eat, exercise, take supplements)
- **Tracking**: Binary (completed or not)
- **Examples**: "Wine", "Sport", "Multivitamins", "D 4000"
- **Question**: "Did I do this today?"

### Health Aspects
- **Purpose**: Track health indicators and symptoms
- **Tracking**: Severity scale 0-10 (0 = not present, 10 = severe)
- **Examples**: "Anxiety", "Sickness", "Good sleep"
- **Question**: "How was this today?" (intensity/severity)

## Backend Implementation

### New Database Models

#### `HealthAspect`
```python
- id: Primary key
- name: Name of the health aspect
- description: Optional description
- color: Color for UI (#EF4444 default - red-ish for health concerns)
- icon: Emoji icon
- category: "Mental", "Physical", "Sleep", or custom
- is_positive: True for positive aspects like "Good sleep"
- is_active: Soft delete flag
- created_at: Timestamp
```

#### `HealthAspectEntry`
```python
- id: Primary key
- aspect_id: Foreign key to health_aspects
- date: Date of entry
- severity: 0-10 scale (0 = not present, 7 = default from migration)
- notes: Optional notes
- created_at: Timestamp
```

### New API Endpoints

#### Health Aspects Management
- `GET /api/health-aspects` - Get all health aspects
- `GET /api/health-aspects/{id}` - Get specific aspect
- `POST /api/health-aspects` - Create new aspect
- `PUT /api/health-aspects/{id}` - Update aspect
- `DELETE /api/health-aspects/{id}` - Soft delete (archive)
- `POST /api/health-aspects/{id}/archive` - Archive aspect
- `POST /api/health-aspects/{id}/unarchive` - Restore aspect
- `GET /api/health-aspects/categories/list` - Get unique categories

#### Health Aspect Entries
- `POST /api/health-aspects/entries` - Create/update entry
- `GET /api/health-aspects/entries/range` - Get entries for date range
- `GET /api/health-aspects/entries/date/{date}` - Get entries for specific date

#### Analytics
- `GET /api/analytics/correlations/health-aspects` - Calculate correlations between habits and health aspects
  - **Query params**: `aspect_id` (optional), `start_date`, `end_date`, `min_samples`
  - **Returns**: For each health aspect, shows which habits correlate (positively or negatively)
  
## How Correlations Work

### Example Interpretations

#### Positive Correlation (+0.5 to +1.0)
- **Wine → Anxiety**: Higher wine consumption correlates with more anxiety
- **Beer → Bad sleep**: Drinking beer correlates with worse sleep quality

#### Negative Correlation (-0.5 to -1.0)
- **Sport → Anxiety**: Exercising correlates with less anxiety
- **D 4000 → Mental fog**: Taking Vitamin D correlates with less mental fog

#### Weak/No Correlation (-0.2 to +0.2)
- No meaningful relationship detected

### Statistical Significance
- **p-value < 0.05**: Result is statistically significant (likely a real correlation)
- **p-value ≥ 0.05**: May be random chance
- **sample_size**: Number of days with overlapping data (need at least 7)

## Migration Details

### What Happened
1. ✅ Created `health_aspects` and `health_aspect_entries` tables
2. ✅ Migrated 12 health indicators from habits table
3. ✅ Converted 487 historical habit entries to health aspect entries
4. ✅ Original habits archived (not deleted) for data integrity
5. ✅ Assigned categories: Mental, Physical, Sleep
6. ✅ Marked "Good sleep" as positive indicator

### Data Conversion
- Original: `completed = TRUE/FALSE`
- New: `severity = 7/0`
  - TRUE (completed) → severity 7 (moderate presence)
  - FALSE (not completed) → severity 0 (not present)

**Note**: You can manually adjust severity values 1-10 going forward for more granular tracking.

## Frontend API Client

The frontend now has full API support for health aspects:

```typescript
// Get all health aspects
const aspects = await healthAspectsApi.getAll()

// Create entry for today
await healthAspectEntriesApi.create({
  aspect_id: 1,
  date: '2025-12-06',
  severity: 5,  // 0-10 scale
  notes: 'Moderate anxiety today'
})

// Get correlations
const correlations = await analyticsApi.getHabitHealthAspectCorrelations()
```

## Frontend Implementation ✅

### Health & Wellness Page (formerly Mood)

The "Mood" page has been renamed to "Health & Wellness" and now includes:

#### Health Indicators Section
- **Binary Tracking**: Simple yes/no checkboxes for each health aspect
- **Category Grouping**: Aspects grouped by Mental, Physical, Sleep
- **Visual Feedback**: 
  - Positive aspects (like "Good sleep") show green when checked
  - Negative aspects (like "Anxiety", "Bad sleep") show red when checked
  - Unchecked aspects show gray
- **Today's Data**: Always shows and tracks today's health indicators
- **Icons**: Each aspect has an emoji icon for quick visual recognition

#### Mood Tracker Section (Existing)
- Mood score (1-10)
- Energy level (1-10)
- Stress level (1-10)
- Notes and tags
- Recent check-ins history

### Navigation
- Updated navigation menu: **Dashboard → Habits → Health → Analytics**
- Old `/mood` route redirects to `/health`
- New heart icon (❤️) for Health tab

### How Binary Tracking Works

**In the Database:**
- `severity = 0`: Aspect not present today
- `severity = 1`: Aspect present today

**In the UI:**
- Click checkbox to toggle on/off
- Checked (green/red based on `is_positive` flag)
- Unchecked (gray)

### Example Usage

1. **Morning Check-in**: Open Health & Wellness page
2. **Mark Health Indicators**:
   - ✅ Good sleep (green - positive indicator)
   - ✅ Anxiety (red - negative indicator)  
   - ⬜ Sickness (not checked - not present)
3. **Optional**: Log mood if desired
4. **Analytics**: View correlations after 7+ days of tracking

## Next Steps (Pending)

### Dashboard Integration (TODO)
- Show today's health aspects summary
- Quick indicators for active health concerns
- Count of positive vs negative indicators

### Analytics Page (TODO)
- **Health Correlations Tab**: New section showing:
  - Which habits correlate with each health aspect
  - Visual charts for strongest correlations
  - Filter by health aspect category
  - Statistical significance indicators

Example insights you'll see:
- "Sport" → Anxiety: -0.65 (exercise significantly reduces anxiety)
- "Wine" → Bad sleep: +0.52 (wine significantly worsens sleep)
- "D 4000" → Mental fog: -0.45 (Vitamin D may help with mental clarity)

## Usage Example

### Scenario: Finding What Helps with Anxiety

1. **Track Habits**: Wine, Sport, D 4000, Multivitamins, etc.
2. **Track Health Aspect**: Anxiety (severity 0-10 daily)
3. **Wait for Data**: Track for at least 7 days
4. **View Correlations**: Check `/api/analytics/correlations/health-aspects?aspect_id=6`

**Results might show**:
- Sport: -0.65 (p=0.002) ✅ Significant negative - exercise helps!
- Wine: +0.52 (p=0.01) ⚠️ Significant positive - wine worsens anxiety
- D 4000: -0.23 (p=0.15) ❌ Not significant - no clear effect

## Database Files

- **Main database**: `data/habits_tracker.db`
- **Tables added**:
  - `health_aspects` (12 rows)
  - `health_aspect_entries` (487 rows)
- **Original habits**: Marked as `is_active=0` (archived)

## Running the Migration Again

If you need to re-run or run on another database:

```bash
# Interactive (asks for confirmation)
python backend/migrate_habits_to_health_aspects.py ./data/habits_tracker.db

# Non-interactive (auto-confirm)
python backend/migrate_habits_to_health_aspects.py ./data/habits_tracker.db -y
```

## Benefits

1. **Clearer Data Structure**: Separate what you do from how you feel
2. **Better Insights**: Find correlations between actions and health outcomes
3. **Granular Tracking**: 0-10 scale vs binary for health indicators
4. **Historical Preservation**: All 487 historical data points maintained
5. **Flexible Categories**: Mental, Physical, Sleep, or custom categories
6. **Positive/Negative Indicators**: Different interpretation for "Good sleep" vs "Bad sleep"

## API Testing

You can test the new endpoints immediately:

```bash
# Get all health aspects
curl http://localhost:9000/api/health-aspects

# Create an entry for anxiety today
curl -X POST http://localhost:9000/api/health-aspects/entries \
  -H "Content-Type: application/json" \
  -d '{"aspect_id": 6, "date": "2025-12-06", "severity": 4}'

# Get correlations
curl "http://localhost:9000/api/analytics/correlations/health-aspects"
```

## Summary

✅ **Backend**: Fully implemented
✅ **Database**: Migrated successfully (487 entries)
✅ **API**: All endpoints working
✅ **API Client**: Frontend has full access
🔄 **Frontend UI**: Needs implementation (Mood page, Dashboard, Analytics)

The foundation is complete and the data is ready. The next phase is building the frontend UI components to interact with health aspects.

