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
    mood_score = Column(Integer, nullable=False)  # 1-10 scale
    energy_level = Column(Integer, nullable=True)  # 1-10 scale
    stress_level = Column(Integer, nullable=True)  # 1-10 scale
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags
    created_at = Column(DateTime, default=datetime.utcnow)

class HealthAspect(Base):
    __tablename__ = "health_aspects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#EF4444")  # Red-ish for health concerns
    icon = Column(String, nullable=True)
    category = Column(String, default="General")  # Mental, Physical, Sleep, etc.
    is_positive = Column(Boolean, default=False)  # True for positive aspects like "Good sleep"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    entries = relationship("HealthAspectEntry", back_populates="aspect", cascade="all, delete-orphan")

class HealthAspectEntry(Base):
    __tablename__ = "health_aspect_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    aspect_id = Column(Integer, ForeignKey("health_aspects.id"), nullable=False)
    date = Column(Date, nullable=False)
    severity = Column(Integer, nullable=False)  # 1-10 scale (or 0 for not present)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    aspect = relationship("HealthAspect", back_populates="entries")

