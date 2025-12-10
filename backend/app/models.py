from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Habit(Base):
    __tablename__ = "habits"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3B82F6")  # Hex color for UI
    icon = Column(String, nullable=True)  # Emoji or icon name
    category = Column(String, default="General")  # Category for grouping
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    entries = relationship("HabitEntry", back_populates="habit", cascade="all, delete-orphan")

class HabitEntry(Base):
    __tablename__ = "habit_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    habit = relationship("Habit", back_populates="entries")

class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
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

