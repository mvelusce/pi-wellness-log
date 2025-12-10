#!/usr/bin/env python3
"""
Migration script to update mood_entries table schema with new fields:
- Change mood_score, energy_level from 1-10 to 1-5 scale
- Change stress_level from 1-10 to 0-3 scale
- Add new fields: anxiety_level, rumination_level, anger_level (0-3)
- Add new fields: general_health (0-5), sleep_quality, sweating_level, libido_level (0-3)
"""
import sys
import os
import sqlite3

# Add the parent directory to the path so we can import from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set the database URL to point to the actual database in the data directory
DB_PATH = "../data/habits_tracker.db"


def migrate_schema():
    """Add new columns to mood_entries table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🔄 Mood Schema Migration")
    print("=" * 60)
    
    try:
        # Check current schema
        cursor.execute("PRAGMA table_info(mood_entries)")
        columns = {col[1] for col in cursor.fetchall()}
        print(f"\n📋 Current columns: {columns}")
        
        # Add new columns if they don't exist
        new_columns = {
            'anxiety_level': 'INTEGER',
            'rumination_level': 'INTEGER',
            'anger_level': 'INTEGER',
            'general_health': 'INTEGER',
            'sleep_quality': 'INTEGER',
            'sweating_level': 'INTEGER',
            'libido_level': 'INTEGER',
        }
        
        print("\n🔧 Adding new columns...")
        for col_name, col_type in new_columns.items():
            if col_name not in columns:
                cursor.execute(f"ALTER TABLE mood_entries ADD COLUMN {col_name} {col_type}")
                print(f"   ✅ Added column: {col_name}")
            else:
                print(f"   ⏭️  Column already exists: {col_name}")
        
        conn.commit()
        
        # Verify new schema
        cursor.execute("PRAGMA table_info(mood_entries)")
        all_columns = cursor.fetchall()
        print(f"\n📊 Updated schema:")
        for col in all_columns:
            print(f"   - {col[1]} ({col[2]})")
        
        print("\n✅ Schema migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def get_entry_count():
    """Get count of mood entries."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM mood_entries")
    count = cursor.fetchone()[0]
    conn.close()
    return count


if __name__ == "__main__":
    # Check for --commit flag
    auto_commit = "--commit" in sys.argv
    
    print(f"\n📂 Database: {DB_PATH}")
    entry_count = get_entry_count()
    print(f"📊 Total mood entries: {entry_count}\n")
    
    if auto_commit:
        print("⚠️  Auto-committing changes (--commit flag provided)")
        response = "yes"
    else:
        response = input("⚠️  This will add new columns to the mood_entries table. Continue? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        migrate_schema()
        print("\n" + "=" * 60)
        print("✅ Migration complete!")
        print("\nNote: Existing entries will have NULL values for new fields.")
        print("You can now run the data mapping script to convert old values.")
        print("=" * 60 + "\n")
    else:
        print("\n❌ Migration cancelled.")

