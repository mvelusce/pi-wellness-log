from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class LifestyleFactor(Base):
    __tablename__ = "lifestyle_factors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3B82F6")  # Hex color for UI
    icon = Column(String, nullable=True)  # Emoji or icon name
    category = Column(String, default="General")  # Category for grouping
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    entries = relationship("LifestyleFactorEntry", back_populates="lifestyle_factor", cascade="all, delete-orphan")

class LifestyleFactorEntry(Base):
    __tablename__ = "lifestyle_factor_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    lifestyle_factor_id = Column(Integer, ForeignKey("lifestyle_factors.id"), nullable=False)
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lifestyle_factor = relationship("LifestyleFactor", back_populates="entries")

class WellbeingMetricEntry(Base):
    __tablename__ = "wellbeing_metric_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    time = Column(DateTime, nullable=False)
    
    # Mood scores (1-5 scale, higher is better)
    mood_score = Column(Integer, nullable=False)  # 1-5 scale
    energy_level = Column(Integer, nullable=True)  # 1-5 scale
    
    # Stress & Cognitive (0-3 scale, lower is better for negative ones)
    stress_level = Column(Integer, nullable=True)  # 0-3 scale (lower is better)
    anxiety_level = Column(Integer, nullable=True)  # 0-3 scale (lower is better)
    rumination_level = Column(Integer, nullable=True)  # 0-3 scale (lower is better)
    anger_level = Column(Integer, nullable=True)  # 0-3 scale (lower is better)
    
    # Physical symptoms (0-5/0-3 scale, varies by metric)
    general_health = Column(Integer, nullable=True)  # 0-5 scale (higher is better)
    sleep_quality = Column(Integer, nullable=True)  # 0-3 scale (higher is better)
    sweating_level = Column(Integer, nullable=True)  # 0-3 scale (lower is better)
    libido_level = Column(Integer, nullable=True)  # 0-3 scale (higher is better)
    
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags
    created_at = Column(DateTime, default=datetime.utcnow)

class CBTThought(Base):
    __tablename__ = "cbt_thoughts"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime, nullable=False)
    
    # The negative thought content
    negative_thought = Column(Text, nullable=False)
    
    # Cognitive distortions (comma-separated list)
    # e.g., "all-or-nothing,catastrophizing,mind-reading"
    distortions = Column(String, nullable=True)
    
    # Alternative/balanced interpretation
    alternative_thought = Column(Text, nullable=True)
    
    # Optional notes and metadata
    notes = Column(Text, nullable=True)
    intensity = Column(Integer, nullable=True)  # 1-10 scale for thought intensity
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

