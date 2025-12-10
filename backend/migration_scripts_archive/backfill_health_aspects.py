"""
Backfill health aspect entries for correlation analysis.

Problem: Legacy data only recorded health aspects when they were present (severity=10).
For correlation analysis, we need both presence (severity>0) and absence (severity=0) days.

Solution: For each health aspect, fill in severity=0 for dates where:
- At least one habit was tracked
- The health aspect was NOT tracked (assumed to be absent/not present)
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

def backfill_health_aspect_entries(conn):
    """Fill in missing health aspect entries with severity=0"""
    cursor = conn.cursor()
    
    # Get all health aspects
    cursor.execute("SELECT id, name FROM health_aspects WHERE is_active = 1")
    aspects = cursor.fetchall()
    
    # Get all unique dates where ANY habit was tracked
    cursor.execute("""
        SELECT DISTINCT date 
        FROM habit_entries 
        WHERE habit_id IN (SELECT id FROM habits WHERE is_active = 1)
        ORDER BY date
    """)
    all_tracked_dates = [row[0] for row in cursor.fetchall()]
    
    print(f"📅 Found {len(all_tracked_dates)} unique dates with habit tracking")
    
    total_backfilled = 0
    
    for aspect_id, aspect_name in aspects:
        # Get dates where this aspect was already tracked
        cursor.execute("""
            SELECT DISTINCT date 
            FROM health_aspect_entries 
            WHERE aspect_id = ?
        """, (aspect_id,))
        tracked_aspect_dates = set(row[0] for row in cursor.fetchall())
        
        # Find missing dates (dates with habits but no aspect entry)
        missing_dates = [d for d in all_tracked_dates if d not in tracked_aspect_dates]
        
        if missing_dates:
            # Insert severity=0 entries for missing dates
            for missing_date in missing_dates:
                cursor.execute("""
                    INSERT INTO health_aspect_entries (aspect_id, date, severity, created_at)
                    VALUES (?, ?, 0, ?)
                """, (aspect_id, missing_date, datetime.utcnow()))
            
            conn.commit()
            total_backfilled += len(missing_dates)
            print(f"✅ '{aspect_name}': Added {len(missing_dates)} absent days (severity=0)")
        else:
            print(f"ℹ️  '{aspect_name}': No backfill needed")
    
    return total_backfilled

def verify_backfill(conn):
    """Verify the backfill worked"""
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM health_aspect_entries")
    total_entries = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM health_aspect_entries WHERE severity = 0")
    zero_entries = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM health_aspect_entries WHERE severity > 0")
    positive_entries = cursor.fetchone()[0]
    
    print(f"\n📊 Verification:")
    print(f"   - Total health aspect entries: {total_entries}")
    print(f"   - Absent days (severity=0): {zero_entries}")
    print(f"   - Present days (severity>0): {positive_entries}")
    print(f"   - Ratio: {(positive_entries/total_entries*100):.1f}% present")

def backfill_database(db_path):
    """Main backfill function"""
    conn = sqlite3.connect(db_path)
    
    try:
        print(f"📊 Starting backfill for: {db_path}\n")
        
        backfilled = backfill_health_aspect_entries(conn)
        
        verify_backfill(conn)
        
        print(f"\n✅ Backfill completed successfully!")
        print(f"   - Added {backfilled} absence entries (severity=0)")
        print(f"   - Now ready for correlation analysis!")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Backfill failed: {e}")
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
        sys.exit(1)
    
    if not auto_confirm:
        response = input(f"Backfill health aspect entries in {db_path}? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Backfill cancelled.")
            sys.exit(0)
    else:
        print(f"Auto-confirmed (-y flag), proceeding with backfill...\n")
    
    success = backfill_database(db_path)
    sys.exit(0 if success else 1)

