from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List

# Habit Schemas
class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    icon: Optional[str] = None
    category: str = "General"

class HabitCreate(HabitBase):
    pass

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class Habit(HabitBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Habit Entry Schemas
class HabitEntryBase(BaseModel):
    habit_id: int
    date: date
    completed: bool
    notes: Optional[str] = None

class HabitEntryCreate(HabitEntryBase):
    pass

class HabitEntryUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = None

class HabitEntry(HabitEntryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Mood Entry Schemas
class MoodEntryBase(BaseModel):
    date: date
    # Mood scores (1-5 scale, higher is better)
    mood_score: int = Field(ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    # Stress & Cognitive (0-3 scale, lower is better for negative ones)
    stress_level: Optional[int] = Field(None, ge=0, le=3)
    anxiety_level: Optional[int] = Field(None, ge=0, le=3)
    rumination_level: Optional[int] = Field(None, ge=0, le=3)
    anger_level: Optional[int] = Field(None, ge=0, le=3)
    # Physical symptoms
    general_health: Optional[int] = Field(None, ge=0, le=5)
    sleep_quality: Optional[int] = Field(None, ge=0, le=3)
    sweating_level: Optional[int] = Field(None, ge=0, le=3)
    libido_level: Optional[int] = Field(None, ge=0, le=3)
    notes: Optional[str] = None
    tags: Optional[str] = None

class MoodEntryCreate(MoodEntryBase):
    pass

class MoodEntryUpdate(BaseModel):
    mood_score: Optional[int] = Field(None, ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    stress_level: Optional[int] = Field(None, ge=0, le=3)
    anxiety_level: Optional[int] = Field(None, ge=0, le=3)
    rumination_level: Optional[int] = Field(None, ge=0, le=3)
    anger_level: Optional[int] = Field(None, ge=0, le=3)
    general_health: Optional[int] = Field(None, ge=0, le=5)
    sleep_quality: Optional[int] = Field(None, ge=0, le=3)
    sweating_level: Optional[int] = Field(None, ge=0, le=3)
    libido_level: Optional[int] = Field(None, ge=0, le=3)
    notes: Optional[str] = None
    tags: Optional[str] = None

class MoodEntry(MoodEntryBase):
    id: int
    time: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics Schemas
class CorrelationResult(BaseModel):
    habit_name: str
    habit_id: int
    correlation: float
    p_value: float
    significant: bool
    sample_size: int

class HabitStats(BaseModel):
    habit_id: int
    habit_name: str
    total_days: int
    completed_days: int
    completion_rate: float
    current_streak: int
    longest_streak: int

class MoodStats(BaseModel):
    average_mood: float
    average_energy: Optional[float]
    average_stress: Optional[float]
    average_anxiety: Optional[float]
    average_rumination: Optional[float]
    average_anger: Optional[float]
    average_general_health: Optional[float]
    average_sleep_quality: Optional[float]
    average_sweating: Optional[float]
    average_libido: Optional[float]
    total_entries: int
    date_range: dict

