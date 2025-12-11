from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List

# Lifestyle Factor Schemas
class LifestyleFactorBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    icon: Optional[str] = None
    category: str = "General"

class LifestyleFactorCreate(LifestyleFactorBase):
    pass

class LifestyleFactorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class LifestyleFactor(LifestyleFactorBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Lifestyle Factor Entry Schemas
class LifestyleFactorEntryBase(BaseModel):
    lifestyle_factor_id: int
    date: date
    completed: bool
    notes: Optional[str] = None

class LifestyleFactorEntryCreate(LifestyleFactorEntryBase):
    pass

class LifestyleFactorEntryUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = None

class LifestyleFactorEntry(LifestyleFactorEntryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Well-Being Metric Entry Schemas
class WellbeingMetricEntryBase(BaseModel):
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

class WellbeingMetricEntryCreate(WellbeingMetricEntryBase):
    pass

class WellbeingMetricEntryUpdate(BaseModel):
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

class WellbeingMetricEntry(WellbeingMetricEntryBase):
    id: int
    time: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics Schemas
class CorrelationResult(BaseModel):
    lifestyle_factor_name: str
    lifestyle_factor_id: int
    metric_name: str  # e.g., "mood_score", "energy_level", etc.
    correlation: float
    p_value: float
    significant: bool
    sample_size: int

class MetricCorrelationSummary(BaseModel):
    """Summary of correlations for a single metric across all lifestyle factors"""
    metric_name: str
    metric_display_name: str
    correlations: List[CorrelationResult]
    
class MultiMetricCorrelationResult(BaseModel):
    """All correlations organized by metric"""
    by_metric: List[MetricCorrelationSummary]
    by_lifestyle_factor: dict  # lifestyle_factor_id -> list of correlations across metrics

class LifestyleFactorStats(BaseModel):
    lifestyle_factor_id: int
    lifestyle_factor_name: str
    total_days: int
    completed_days: int
    completion_rate: float
    current_streak: int
    longest_streak: int

class WellbeingMetricStats(BaseModel):
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

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# CBT Thought Schemas
class CBTThoughtBase(BaseModel):
    date: date
    negative_thought: str
    distortions: Optional[str] = None  # Comma-separated list of distortion types
    alternative_thought: Optional[str] = None
    notes: Optional[str] = None
    intensity: Optional[int] = Field(None, ge=1, le=10)  # 1-10 scale

class CBTThoughtCreate(CBTThoughtBase):
    pass

class CBTThoughtUpdate(BaseModel):
    negative_thought: Optional[str] = None
    distortions: Optional[str] = None
    alternative_thought: Optional[str] = None
    notes: Optional[str] = None
    intensity: Optional[int] = Field(None, ge=1, le=10)

class CBTThought(CBTThoughtBase):
    id: int
    time: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

