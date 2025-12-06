"""
Database migration script to add category column to habits table.

Run this script to update your existing database with the new category field.
"""

import sqlite3
import sys
from pathlib import Path

def migrate_database(db_path):
    """Add category column to habits table if it doesn't exist"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if category column exists
        cursor.execute("PRAGMA table_info(habits)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'category' not in columns:
            print("Adding 'category' column to habits table...")
            cursor.execute("ALTER TABLE habits ADD COLUMN category VARCHAR DEFAULT 'General'")
            conn.commit()
            print("✅ Migration successful: Added category column")
        else:
            print("✅ Category column already exists, no migration needed")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    # Default database path
    db_path = Path(__file__).parent.parent.parent / "data" / "habits_tracker.db"
    
    # Allow custom path as argument
    if len(sys.argv) > 1:
        db_path = Path(sys.argv[1])
    
    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        print("Please provide the correct database path:")
        print(f"  python {Path(__file__).name} /path/to/habits_tracker.db")
        sys.exit(1)
    
    print(f"📊 Migrating database: {db_path}")
    success = migrate_database(db_path)
    sys.exit(0 if success else 1)

