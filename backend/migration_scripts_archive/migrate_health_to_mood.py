#!/usr/bin/env python3
"""
Script to migrate health aspect data into mood entry fields.

Mapping:
- Anxiety (ID 6) -> anxiety_level = 3 if marked
- Rumination (ID 2) -> rumination_level = 3 if marked
- Anger (ID 3) -> anger_level = 3 if marked
- Bad sleep (ID 7) -> sleep_quality = 0 if marked
- Good sleep (ID 1) -> sleep_quality = 3 if marked
- Sweat problems (ID 9) -> sweating_level = 3 if marked
- Sickness (ID 8) -> general_health = 0 if marked
- ED (ID 10) -> libido_level = 0 if marked
- MME (ID 11) -> libido_level = 3 if marked
"""
import sys
import os
import sqlite3
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "../data/habits_tracker.db"

# Health aspect ID mapping
HEALTH_ASPECT_MAPPING = {
    6: ('anxiety_level', 3),           # Anxiety -> 3
    2: ('rumination_level', 3),        # Rumination -> 3
    3: ('anger_level', 3),             # Anger -> 3
    7: ('sleep_quality', 0),           # Bad sleep -> 0
    1: ('sleep_quality', 3),           # Good sleep -> 3
    9: ('sweating_level', 3),          # Sweat problems -> 3
    8: ('general_health', 0),          # Sickness -> 0
    10: ('libido_level', 0),           # ED -> 0
    11: ('libido_level', 3),           # MME -> 3
}


def get_or_create_mood_entry(cursor, date):
    """
    Get existing mood entry for a date, or create a new one.
    Returns the mood entry id.
    """
    # Check if mood entry exists for this date
    cursor.execute("""
        SELECT id FROM mood_entries WHERE date = ?
    """, (date,))
    
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # Create new mood entry with default values
    cursor.execute("""
        INSERT INTO mood_entries (
            date, time, mood_score, 
            anxiety_level, rumination_level, anger_level,
            general_health, sleep_quality, sweating_level, libido_level,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        date, 
        datetime.now(),  # time
        3,  # default mood_score (middle of 1-5 scale)
        0,  # anxiety_level
        0,  # rumination_level
        0,  # anger_level
        3,  # general_health (middle of 0-5 scale)
        None,  # sleep_quality (no default)
        0,  # sweating_level
        None,  # libido_level (no default)
        datetime.now()  # created_at
    ))
    
    return cursor.lastrowid


def migrate_health_aspects_to_mood(dry_run=True):
    """
    Migrate health aspect entries to mood entry fields.
    
    Args:
        dry_run: If True, show what would be changed without updating
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("🔄 Health Aspects → Mood Entries Migration")
    print("=" * 80)
    
    try:
        # Get all health aspect entries that we care about
        cursor.execute("""
            SELECT hae.date, hae.aspect_id, ha.name, hae.severity
            FROM health_aspect_entries hae
            JOIN health_aspects ha ON hae.aspect_id = ha.id
            WHERE hae.aspect_id IN (1, 2, 3, 6, 7, 8, 9, 10, 11)
              AND hae.severity > 0
            ORDER BY hae.date
        """)
        
        health_entries = cursor.fetchall()
        
        print(f"\n📊 Found {len(health_entries)} health aspect entries to migrate\n")
        
        # Group by date
        date_mappings = {}
        for date, aspect_id, aspect_name, severity in health_entries:
            if date not in date_mappings:
                date_mappings[date] = {}
            
            field_name, field_value = HEALTH_ASPECT_MAPPING[aspect_id]
            
            # Handle conflicts (e.g., both Good sleep and Bad sleep on same day)
            if field_name in date_mappings[date]:
                # For sleep: prefer Good sleep (3) over Bad sleep (0)
                if field_name == 'sleep_quality':
                    date_mappings[date][field_name] = max(date_mappings[date][field_name], field_value)
                # For libido: prefer MME (3) over ED (0)
                elif field_name == 'libido_level':
                    date_mappings[date][field_name] = max(date_mappings[date][field_name], field_value)
                # For others: take the maximum (most severe)
                else:
                    date_mappings[date][field_name] = max(date_mappings[date][field_name], field_value)
            else:
                date_mappings[date][field_name] = field_value
        
        print(f"📅 Processing {len(date_mappings)} unique dates\n")
        
        # Show sample
        sample_dates = list(date_mappings.keys())[:5]
        print("📋 Sample mappings (first 5 dates):")
        for date in sample_dates:
            print(f"\n  {date}:")
            for field, value in date_mappings[date].items():
                print(f"    {field}: {value}")
        
        if len(date_mappings) > 5:
            print(f"\n  ... and {len(date_mappings) - 5} more dates")
        
        print("\n" + "-" * 80)
        
        stats = {
            'mood_entries_created': 0,
            'mood_entries_updated': 0,
            'fields_updated': 0
        }
        
        if not dry_run:
            print("\n💾 Applying changes...")
            
            for date, fields in date_mappings.items():
                # Check if mood entry exists
                cursor.execute("SELECT id FROM mood_entries WHERE date = ?", (date,))
                result = cursor.fetchone()
                
                if result:
                    mood_entry_id = result[0]
                    stats['mood_entries_updated'] += 1
                    
                    # Update existing mood entry
                    update_parts = []
                    update_values = []
                    
                    for field_name, field_value in fields.items():
                        update_parts.append(f"{field_name} = ?")
                        update_values.append(field_value)
                        stats['fields_updated'] += 1
                    
                    update_values.append(mood_entry_id)
                    
                    update_sql = f"""
                        UPDATE mood_entries 
                        SET {', '.join(update_parts)}
                        WHERE id = ?
                    """
                    
                    cursor.execute(update_sql, update_values)
                else:
                    # Create new mood entry
                    stats['mood_entries_created'] += 1
                    
                    # Prepare default values
                    entry_data = {
                        'date': date,
                        'time': datetime.now(),
                        'mood_score': 3,
                        'anxiety_level': 0,
                        'rumination_level': 0,
                        'anger_level': 0,
                        'general_health': 3,
                        'sleep_quality': None,
                        'sweating_level': 0,
                        'libido_level': None,
                        'created_at': datetime.now()
                    }
                    
                    # Override with health aspect data
                    entry_data.update(fields)
                    stats['fields_updated'] += len(fields)
                    
                    cursor.execute("""
                        INSERT INTO mood_entries (
                            date, time, mood_score,
                            anxiety_level, rumination_level, anger_level,
                            general_health, sleep_quality, sweating_level, libido_level,
                            created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        entry_data['date'],
                        entry_data['time'],
                        entry_data['mood_score'],
                        entry_data['anxiety_level'],
                        entry_data['rumination_level'],
                        entry_data['anger_level'],
                        entry_data['general_health'],
                        entry_data['sleep_quality'],
                        entry_data['sweating_level'],
                        entry_data['libido_level'],
                        entry_data['created_at']
                    ))
            
            conn.commit()
            
            print("\n✅ Migration completed successfully!")
            print(f"\n📊 Statistics:")
            print(f"   - Mood entries created: {stats['mood_entries_created']}")
            print(f"   - Mood entries updated: {stats['mood_entries_updated']}")
            print(f"   - Total fields updated: {stats['fields_updated']}")
        else:
            print("\n⚠️  DRY RUN MODE - No changes made")
            print("   Run with --commit flag to apply changes")
            
            # Estimate what would happen
            for date in date_mappings.keys():
                cursor.execute("SELECT id FROM mood_entries WHERE date = ?", (date,))
                if cursor.fetchone():
                    stats['mood_entries_updated'] += 1
                else:
                    stats['mood_entries_created'] += 1
            
            print(f"\n📊 Would process:")
            print(f"   - Mood entries to create: {stats['mood_entries_created']}")
            print(f"   - Mood entries to update: {stats['mood_entries_updated']}")
    
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    """Main function."""
    auto_commit = "--commit" in sys.argv
    
    print(f"\n📂 Database: {DB_PATH}\n")
    
    print("⚠️  IMPORTANT: This script will migrate health aspect data to mood entries:")
    print("   - Anxiety → anxiety_level (3)")
    print("   - Rumination → rumination_level (3)")
    print("   - Anger → anger_level (3)")
    print("   - Bad sleep → sleep_quality (0)")
    print("   - Good sleep → sleep_quality (3)")
    print("   - Sweat problems → sweating_level (3)")
    print("   - Sickness → general_health (0)")
    print("   - ED → libido_level (0)")
    print("   - MME → libido_level (3)")
    print()
    
    if auto_commit:
        print("💾 --commit flag provided, changes will be applied")
        migrate_health_aspects_to_mood(dry_run=False)
    else:
        print("🔍 Running in DRY RUN mode (use --commit to apply changes)")
        migrate_health_aspects_to_mood(dry_run=True)
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()

