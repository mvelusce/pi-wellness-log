#!/usr/bin/env python3
"""
Import legacy habit data from CSV files into the new habits tracker database.

Usage:
    python import_legacy_data.py --habits=../data/Habits.csv --checkmarks=../data/Checkmarks.csv

Note: Make sure to run this from the backend directory or set PYTHONPATH appropriately.
      The database will be created at ./data/habits_tracker.db (for Docker compatibility).
"""

import csv
import sys
import argparse
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Habit, HabitEntry

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Icon mapping based on habit categories
ICON_MAPPING = {
    # Food
    'Milk': '🥛', 'Sweet breakfast': '🥐', 'Savory breakfast': '🍳',
    'Red meat': '🥩', 'White meat': '🍗', 'Fish': '🐟',
    'Vegetables': '🥗', 'Eggs': '🥚', 'Avocado': '🥑',
    'Dairy without lactose': '🧀', 'Dairy with lactose': '🧀',
    'Sweets': '🍰', 'Pizza': '🍕', 'Fast food': '🍔',
    # Drinks
    'Wine': '🍷', 'Beer': '🍺', 'Liquor': '🥃',
    # Health
    'Fasting': '⏰', 'Sport': '🏃', 'Meditation': '🧘',
    'Good sleep': '😴', 'Cold shower': '🚿', 'Hot shower': '🚿',
    'Belly breathing': '🫁',
    # Supplements (default)
    'Multivitamins': '💊', 'D 4000': '💊', 'C 1000': '💊',
    'K': '💊', 'Zinco': '💊', 'B': '💊', 'Iron': '💊',
    'Magnesium': '💊', 'Omega 3': '💊', 'Proteins': '💊',
    # Well-being
    'Well being': '😊',
}


def parse_color(color_str):
    """Convert color string to hex format."""
    if color_str and color_str.startswith('#'):
        return color_str
    return '#3B82F6'  # Default blue


def get_icon(habit_name):
    """Get icon for habit name."""
    return ICON_MAPPING.get(habit_name, '✓')


def import_habits(habits_file, db: Session):
    """Import habits from CSV file."""
    print(f"📚 Importing habits from {habits_file}...")
    
    habit_map = {}  # position -> habit_id mapping
    
    with open(habits_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        imported_count = 0
        skipped_count = 0
        
        for row in reader:
            name = row['Name']
            archived = row.get('Archived?', 'false').lower() == 'true'
            
            # Check if habit already exists
            existing = db.query(Habit).filter(Habit.name == name).first()
            if existing:
                habit_map[row['Position']] = existing.id
                skipped_count += 1
                continue
            
            # Create new habit
            habit = Habit(
                name=name,
                description=row.get('Question', '') or row.get('Description', '') or None,
                color=parse_color(row.get('Color', '')),
                icon=get_icon(name),
                is_active=not archived
            )
            
            db.add(habit)
            db.flush()  # Get the ID
            habit_map[row['Position']] = habit.id
            imported_count += 1
            
            print(f"  ✓ {name} (ID: {habit.id}, Active: {habit.is_active})")
    
    db.commit()
    print(f"✅ Imported {imported_count} new habits, skipped {skipped_count} existing")
    return habit_map


def import_checkmarks(checkmarks_file, habit_map, db: Session, skip_archived=True):
    """Import checkmarks from CSV file."""
    print(f"\n📊 Importing checkmarks from {checkmarks_file}...")
    
    with open(checkmarks_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Get habit names from header
        fieldnames = reader.fieldnames
        habit_columns = [col for col in fieldnames if col != 'Date']
        
        imported_count = 0
        skipped_count = 0
        dates_processed = 0
        
        for row in reader:
            date_str = row['Date']
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                print(f"  ⚠️  Invalid date format: {date_str}")
                continue
            
            dates_processed += 1
            
            for habit_name in habit_columns:
                value = row.get(habit_name, '').strip()
                
                # Only import YES_MANUAL as completed
                if value != 'YES_MANUAL':
                    continue
                
                # Find habit ID by name
                habit = db.query(Habit).filter(Habit.name == habit_name).first()
                if not habit:
                    continue
                
                # Skip archived habits if requested
                if skip_archived and not habit.is_active:
                    skipped_count += 1
                    continue
                
                # Check if entry already exists
                existing = db.query(HabitEntry).filter(
                    HabitEntry.habit_id == habit.id,
                    HabitEntry.date == date_obj
                ).first()
                
                if existing:
                    if not existing.completed:
                        existing.completed = True
                        imported_count += 1
                    continue
                
                # Create new entry
                entry = HabitEntry(
                    habit_id=habit.id,
                    date=date_obj,
                    completed=True,
                    notes=None
                )
                db.add(entry)
                imported_count += 1
            
            if dates_processed % 50 == 0:
                print(f"  Processing... {dates_processed} dates")
                db.commit()
        
        db.commit()
    
    print(f"✅ Imported {imported_count} checkmarks from {dates_processed} dates")
    print(f"   Skipped {skipped_count} archived habit entries")


def main():
    parser = argparse.ArgumentParser(description='Import legacy habit data from CSV files')
    parser.add_argument('--habits', required=True, help='Path to Habits.csv file')
    parser.add_argument('--checkmarks', required=True, help='Path to Checkmarks.csv file')
    parser.add_argument('--include-archived', action='store_true', 
                       help='Import checkmarks for archived habits')
    
    args = parser.parse_args()
    
    print("🚀 Starting legacy data import...\n")
    
    db = SessionLocal()
    try:
        # Import habits first
        habit_map = import_habits(args.habits, db)
        
        # Then import checkmarks
        import_checkmarks(args.checkmarks, habit_map, db, 
                         skip_archived=not args.include_archived)
        
        # Print summary
        total_habits = db.query(Habit).count()
        active_habits = db.query(Habit).filter(Habit.is_active == True).count()
        total_entries = db.query(HabitEntry).count()
        
        print("\n📈 Database Summary:")
        print(f"   Total habits: {total_habits} ({active_habits} active)")
        print(f"   Total entries: {total_entries}")
        print("\n✨ Import completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()

