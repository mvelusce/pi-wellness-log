from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Habit)
def create_habit(habit: schemas.HabitCreate, db: Session = Depends(get_db)):
    """Create a new habit to track"""
    db_habit = models.Habit(**habit.model_dump())
    db.add(db_habit)
    db.commit()
    db.refresh(db_habit)
    return db_habit

@router.get("/", response_model=List[schemas.Habit])
def get_habits(include_inactive: bool = False, db: Session = Depends(get_db)):
    """Get all habits"""
    query = db.query(models.Habit)
    if not include_inactive:
        query = query.filter(models.Habit.is_active == True)
    return query.order_by(models.Habit.created_at).all()

@router.get("/{habit_id}", response_model=schemas.Habit)
def get_habit(habit_id: int, db: Session = Depends(get_db)):
    """Get a specific habit"""
    habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit

@router.put("/{habit_id}", response_model=schemas.Habit)
def update_habit(habit_id: int, habit_update: schemas.HabitUpdate, db: Session = Depends(get_db)):
    """Update a habit"""
    db_habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not db_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    update_data = habit_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_habit, key, value)
    
    db.commit()
    db.refresh(db_habit)
    return db_habit

@router.delete("/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    """Delete a habit (soft delete by marking as inactive)"""
    db_habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not db_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    db_habit.is_active = False
    db.commit()
    return {"message": "Habit deleted successfully"}

@router.post("/{habit_id}/archive", response_model=schemas.Habit)
def archive_habit(habit_id: int, db: Session = Depends(get_db)):
    """Archive a habit (set is_active to False)"""
    db_habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not db_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    db_habit.is_active = False
    db.commit()
    db.refresh(db_habit)
    return db_habit

@router.post("/{habit_id}/unarchive", response_model=schemas.Habit)
def unarchive_habit(habit_id: int, db: Session = Depends(get_db)):
    """Unarchive a habit (set is_active to True)"""
    db_habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not db_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    db_habit.is_active = True
    db.commit()
    db.refresh(db_habit)
    return db_habit

@router.get("/categories/list")
def get_categories(db: Session = Depends(get_db)):
    """Get all unique habit categories"""
    categories = db.query(models.Habit.category).distinct().all()
    return {"categories": [cat[0] for cat in categories if cat[0]]}


@router.post("/entries", response_model=schemas.HabitEntry)
def create_habit_entry(entry: schemas.HabitEntryCreate, db: Session = Depends(get_db)):
    """Create or update a habit entry for a specific date"""
    # Check if entry already exists for this habit and date
    existing_entry = db.query(models.HabitEntry).filter(
        models.HabitEntry.habit_id == entry.habit_id,
        models.HabitEntry.date == entry.date
    ).first()
    
    if existing_entry:
        existing_entry.completed = entry.completed
        existing_entry.notes = entry.notes
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
    
    db_entry = models.HabitEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/entries/range", response_model=List[schemas.HabitEntry])
def get_habit_entries_range(
    start_date: date,
    end_date: date,
    habit_id: int = None,
    db: Session = Depends(get_db)
):
    """Get habit entries for a date range"""
    query = db.query(models.HabitEntry).filter(
        models.HabitEntry.date >= start_date,
        models.HabitEntry.date <= end_date
    )
    
    if habit_id:
        query = query.filter(models.HabitEntry.habit_id == habit_id)
    
    return query.order_by(models.HabitEntry.date).all()

@router.get("/entries/date/{entry_date}", response_model=List[schemas.HabitEntry])
def get_habit_entries_by_date(entry_date: date, db: Session = Depends(get_db)):
    """Get all habit entries for a specific date"""
    return db.query(models.HabitEntry).filter(
        models.HabitEntry.date == entry_date
    ).all()

@router.get("/{habit_id}/stats", response_model=schemas.HabitStats)
def get_habit_stats(habit_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific habit"""
    habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    entries = db.query(models.HabitEntry).filter(
        models.HabitEntry.habit_id == habit_id
    ).order_by(models.HabitEntry.date).all()
    
    if not entries:
        return schemas.HabitStats(
            habit_id=habit_id,
            habit_name=habit.name,
            total_days=0,
            completed_days=0,
            completion_rate=0.0,
            current_streak=0,
            longest_streak=0
        )
    
    completed_entries = [e for e in entries if e.completed]
    total_days = len(entries)
    completed_days = len(completed_entries)
    completion_rate = (completed_days / total_days * 100) if total_days > 0 else 0
    
    # Calculate streaks
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    # Sort by date
    sorted_entries = sorted(entries, key=lambda x: x.date)
    
    for i, entry in enumerate(sorted_entries):
        if entry.completed:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 0
    
    # Calculate current streak (from today backwards)
    today = date.today()
    for entry in reversed(sorted_entries):
        if entry.date > today:
            continue
        if entry.completed and (today - entry.date).days <= len(sorted_entries):
            current_streak += 1
        else:
            break
    
    return schemas.HabitStats(
        habit_id=habit_id,
        habit_name=habit.name,
        total_days=total_days,
        completed_days=completed_days,
        completion_rate=round(completion_rate, 2),
        current_streak=current_streak,
        longest_streak=longest_streak
    )

