"""
Migration script to move specific habits to health aspects.

This script:
1. Creates the health_aspects and health_aspect_entries tables
2. Migrates specified habits and their historical data to health aspects
3. Preserves all historical tracking data
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

# List of habits to migrate to health aspects
HABITS_TO_MIGRATE = [
    "Good sleep",
    "Rumination",
    "Anger",
    "Pessimism",
    "Mental fog",
    "Anxiety",
    "Bad sleep",
    "Sickness",
    "Sweat problems",
    "ED",
    "MME",
    "Soft"
]

# Categorization for health aspects
ASPECT_CATEGORIES = {
    "Good sleep": ("Sleep", True, "😴"),  # (category, is_positive, icon)
    "Bad sleep": ("Sleep", False, "😪"),
    "Rumination": ("Mental", False, "🌀"),
    "Anger": ("Mental", False, "😠"),
    "Pessimism": ("Mental", False, "😔"),
    "Mental fog": ("Mental", False, "🌫️"),
    "Anxiety": ("Mental", False, "😰"),
    "Sickness": ("Physical", False, "🤒"),
    "Sweat problems": ("Physical", False, "💦"),
    "ED": ("Physical", False, "⚠️"),
    "MME": ("Physical", False, "⚠️"),
    "Soft": ("Physical", False, "⚠️"),
}

def create_health_aspect_tables(conn):
    """Create health_aspects and health_aspect_entries tables"""
    cursor = conn.cursor()
    
    # Create health_aspects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_aspects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL,
            description TEXT,
            color VARCHAR DEFAULT '#EF4444',
            icon VARCHAR,
            category VARCHAR DEFAULT 'General',
            is_positive BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create health_aspect_entries table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_aspect_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            aspect_id INTEGER NOT NULL,
            date DATE NOT NULL,
            severity INTEGER NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (aspect_id) REFERENCES health_aspects (id)
        )
    """)
    
    conn.commit()
    print("✅ Created health_aspects and health_aspect_entries tables")

def migrate_habits_to_aspects(conn):
    """Migrate specified habits and their entries to health aspects"""
    cursor = conn.cursor()
    
    migrated_count = 0
    entries_migrated = 0
    
    for habit_name in HABITS_TO_MIGRATE:
        # Find the habit
        cursor.execute("SELECT id, name, description, color, created_at FROM habits WHERE name = ?", (habit_name,))
        habit = cursor.fetchone()
        
        if not habit:
            print(f"⚠️  Habit '{habit_name}' not found in database, skipping...")
            continue
        
        habit_id, name, description, color, created_at = habit
        
        # Get category info
        category, is_positive, icon = ASPECT_CATEGORIES.get(habit_name, ("General", False, "📊"))
        
        # Create corresponding health aspect
        cursor.execute("""
            INSERT INTO health_aspects (name, description, color, icon, category, is_positive, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        """, (name, description, color or "#EF4444", icon, category, is_positive, created_at))
        
        aspect_id = cursor.lastrowid
        
        # Migrate all habit entries to health aspect entries
        # Convert completed (boolean) to severity (0-10 scale)
        # completed=True -> severity=7 (moderate presence/severity)
        # completed=False -> severity=0 (not present)
        cursor.execute("""
            INSERT INTO health_aspect_entries (aspect_id, date, severity, notes, created_at)
            SELECT ?, date, 
                   CASE WHEN completed = 1 THEN 7 ELSE 0 END,
                   notes, created_at
            FROM habit_entries
            WHERE habit_id = ?
        """, (aspect_id, habit_id))
        
        entries_count = cursor.rowcount
        entries_migrated += entries_count
        
        # Mark the original habit as inactive (archived)
        cursor.execute("UPDATE habits SET is_active = 0 WHERE id = ?", (habit_id,))
        
        migrated_count += 1
        print(f"✅ Migrated '{name}' ({category}) with {entries_count} entries")
    
    conn.commit()
    return migrated_count, entries_migrated

def verify_migration(conn):
    """Verify the migration was successful"""
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM health_aspects WHERE is_active = 1")
    aspects_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM health_aspect_entries")
    entries_count = cursor.fetchone()[0]
    
    print(f"\n📊 Verification:")
    print(f"   - Active health aspects: {aspects_count}")
    print(f"   - Health aspect entries: {entries_count}")

def migrate_database(db_path):
    """Main migration function"""
    conn = sqlite3.connect(db_path)
    
    try:
        print(f"📊 Starting migration for: {db_path}\n")
        
        # Step 1: Create tables
        create_health_aspect_tables(conn)
        
        # Step 2: Migrate habits to health aspects
        print("\n🔄 Migrating habits to health aspects...")
        migrated, entries = migrate_habits_to_aspects(conn)
        
        # Step 3: Verify
        verify_migration(conn)
        
        print(f"\n✅ Migration completed successfully!")
        print(f"   - Migrated {migrated} health aspects")
        print(f"   - Migrated {entries} historical entries")
        print(f"   - Original habits archived (not deleted)")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    # Default database path
    db_path = Path(__file__).parent.parent / "data" / "habits_tracker.db"
    auto_confirm = False
    
    # Allow custom path as argument
    for i, arg in enumerate(sys.argv[1:]):
        if arg in ['-y', '--yes']:
            auto_confirm = True
        else:
            db_path = Path(arg)
    
    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        print("Please provide the correct database path:")
        print(f"  python {Path(__file__).name} /path/to/habits_tracker.db")
        sys.exit(1)
    
    # Show what will be migrated
    print(f"This will migrate the following habits to health aspects:")
    for habit in HABITS_TO_MIGRATE:
        category, is_positive, icon = ASPECT_CATEGORIES.get(habit, ("General", False, "📊"))
        print(f"  {icon} {habit} ({category}{' ✓ positive' if is_positive else ''})")
    print(f"\nDatabase: {db_path}")
    
    # Confirm before migrating
    if not auto_confirm:
        response = input("\nProceed with migration? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Migration cancelled.")
            sys.exit(0)
    else:
        print("\nAuto-confirmed (-y flag), proceeding with migration...")
    
    success = migrate_database(db_path)
    sys.exit(0 if success else 1)

