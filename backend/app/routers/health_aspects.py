from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.HealthAspect)
def create_health_aspect(aspect: schemas.HealthAspectCreate, db: Session = Depends(get_db)):
    """Create a new health aspect to track"""
    db_aspect = models.HealthAspect(**aspect.model_dump())
    db.add(db_aspect)
    db.commit()
    db.refresh(db_aspect)
    return db_aspect

@router.get("/", response_model=List[schemas.HealthAspect])
def get_health_aspects(include_inactive: bool = False, db: Session = Depends(get_db)):
    """Get all health aspects"""
    query = db.query(models.HealthAspect)
    if not include_inactive:
        query = query.filter(models.HealthAspect.is_active == True)
    return query.order_by(models.HealthAspect.created_at).all()

@router.get("/{aspect_id}", response_model=schemas.HealthAspect)
def get_health_aspect(aspect_id: int, db: Session = Depends(get_db)):
    """Get a specific health aspect"""
    aspect = db.query(models.HealthAspect).filter(models.HealthAspect.id == aspect_id).first()
    if not aspect:
        raise HTTPException(status_code=404, detail="Health aspect not found")
    return aspect

@router.put("/{aspect_id}", response_model=schemas.HealthAspect)
def update_health_aspect(aspect_id: int, aspect_update: schemas.HealthAspectUpdate, db: Session = Depends(get_db)):
    """Update a health aspect"""
    db_aspect = db.query(models.HealthAspect).filter(models.HealthAspect.id == aspect_id).first()
    if not db_aspect:
        raise HTTPException(status_code=404, detail="Health aspect not found")
    
    update_data = aspect_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_aspect, key, value)
    
    db.commit()
    db.refresh(db_aspect)
    return db_aspect

@router.delete("/{aspect_id}")
def delete_health_aspect(aspect_id: int, db: Session = Depends(get_db)):
    """Delete a health aspect (soft delete by marking as inactive)"""
    db_aspect = db.query(models.HealthAspect).filter(models.HealthAspect.id == aspect_id).first()
    if not db_aspect:
        raise HTTPException(status_code=404, detail="Health aspect not found")
    
    db_aspect.is_active = False
    db.commit()
    return {"message": "Health aspect deleted successfully"}

@router.post("/{aspect_id}/archive", response_model=schemas.HealthAspect)
def archive_health_aspect(aspect_id: int, db: Session = Depends(get_db)):
    """Archive a health aspect"""
    db_aspect = db.query(models.HealthAspect).filter(models.HealthAspect.id == aspect_id).first()
    if not db_aspect:
        raise HTTPException(status_code=404, detail="Health aspect not found")
    
    db_aspect.is_active = False
    db.commit()
    db.refresh(db_aspect)
    return db_aspect

@router.post("/{aspect_id}/unarchive", response_model=schemas.HealthAspect)
def unarchive_health_aspect(aspect_id: int, db: Session = Depends(get_db)):
    """Unarchive a health aspect"""
    db_aspect = db.query(models.HealthAspect).filter(models.HealthAspect.id == aspect_id).first()
    if not db_aspect:
        raise HTTPException(status_code=404, detail="Health aspect not found")
    
    db_aspect.is_active = True
    db.commit()
    db.refresh(db_aspect)
    return db_aspect

@router.get("/categories/list")
def get_categories(db: Session = Depends(get_db)):
    """Get all unique health aspect categories"""
    categories = db.query(models.HealthAspect.category).distinct().all()
    return {"categories": [cat[0] for cat in categories if cat[0]]}

# Health Aspect Entries
@router.post("/entries", response_model=schemas.HealthAspectEntry)
def create_health_aspect_entry(entry: schemas.HealthAspectEntryCreate, db: Session = Depends(get_db)):
    """Create or update a health aspect entry for a specific date"""
    # Check if entry already exists for this aspect and date
    existing_entry = db.query(models.HealthAspectEntry).filter(
        models.HealthAspectEntry.aspect_id == entry.aspect_id,
        models.HealthAspectEntry.date == entry.date
    ).first()
    
    if existing_entry:
        existing_entry.severity = entry.severity
        existing_entry.notes = entry.notes
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
    
    db_entry = models.HealthAspectEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/entries/range", response_model=List[schemas.HealthAspectEntry])
def get_health_aspect_entries_range(
    start_date: date,
    end_date: date,
    aspect_id: int = None,
    db: Session = Depends(get_db)
):
    """Get health aspect entries for a date range"""
    query = db.query(models.HealthAspectEntry).filter(
        models.HealthAspectEntry.date >= start_date,
        models.HealthAspectEntry.date <= end_date
    )
    
    if aspect_id:
        query = query.filter(models.HealthAspectEntry.aspect_id == aspect_id)
    
    return query.order_by(models.HealthAspectEntry.date).all()

@router.get("/entries/date/{entry_date}", response_model=List[schemas.HealthAspectEntry])
def get_health_aspect_entries_by_date(entry_date: date, db: Session = Depends(get_db)):
    """Get all health aspect entries for a specific date"""
    return db.query(models.HealthAspectEntry).filter(
        models.HealthAspectEntry.date == entry_date
    ).all()

