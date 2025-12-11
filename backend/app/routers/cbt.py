from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.post("/", response_model=schemas.CBTThought)
def create_cbt_thought(thought: schemas.CBTThoughtCreate, db: Session = Depends(get_db)):
    """Create a new CBT thought entry"""
    db_thought = models.CBTThought(
        **thought.model_dump(),
        time=datetime.utcnow()
    )
    db.add(db_thought)
    db.commit()
    db.refresh(db_thought)
    return db_thought

@router.get("/", response_model=List[schemas.CBTThought])
def get_cbt_thoughts(
    start_date: date = None,
    end_date: date = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get CBT thought entries with optional date filtering"""
    query = db.query(models.CBTThought)
    
    if start_date:
        query = query.filter(models.CBTThought.date >= start_date)
    if end_date:
        query = query.filter(models.CBTThought.date <= end_date)
    
    return query.order_by(models.CBTThought.date.desc(), models.CBTThought.time.desc()).limit(limit).all()

@router.get("/{thought_id}", response_model=schemas.CBTThought)
def get_cbt_thought(thought_id: int, db: Session = Depends(get_db)):
    """Get a specific CBT thought entry"""
    thought = db.query(models.CBTThought).filter(models.CBTThought.id == thought_id).first()
    if not thought:
        raise HTTPException(status_code=404, detail="CBT thought not found")
    return thought

@router.get("/date/{entry_date}", response_model=List[schemas.CBTThought])
def get_cbt_thoughts_by_date(entry_date: date, db: Session = Depends(get_db)):
    """Get all CBT thought entries for a specific date"""
    return db.query(models.CBTThought).filter(
        models.CBTThought.date == entry_date
    ).order_by(models.CBTThought.time.desc()).all()

@router.put("/{thought_id}", response_model=schemas.CBTThought)
def update_cbt_thought(
    thought_id: int,
    thought_update: schemas.CBTThoughtUpdate,
    db: Session = Depends(get_db)
):
    """Update a CBT thought entry"""
    db_thought = db.query(models.CBTThought).filter(models.CBTThought.id == thought_id).first()
    if not db_thought:
        raise HTTPException(status_code=404, detail="CBT thought not found")
    
    update_data = thought_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_thought, key, value)
    
    db_thought.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_thought)
    return db_thought

@router.delete("/{thought_id}")
def delete_cbt_thought(thought_id: int, db: Session = Depends(get_db)):
    """Delete a CBT thought entry"""
    db_thought = db.query(models.CBTThought).filter(models.CBTThought.id == thought_id).first()
    if not db_thought:
        raise HTTPException(status_code=404, detail="CBT thought not found")
    
    db.delete(db_thought)
    db.commit()
    return {"message": "CBT thought deleted successfully"}

