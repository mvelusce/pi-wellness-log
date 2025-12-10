#!/usr/bin/env python3
"""
Script to map existing mood entry data to new scales:
- Map mood_score from 1-10 to 1-5
- Map energy_level from 1-10 to 1-5
- Map stress_level from 1-10 to 0-3
- Map existing data to new fields based on user-provided mapping

This script will be populated with the actual mapping logic after the user provides it.
"""
import sys
import os
import sqlite3

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Database path
DB_PATH = "../data/habits_tracker.db"


def scale_1_10_to_1_5(value):
    """
    Convert a value from 1-10 scale to 1-5 scale.
    1-2 -> 1
    3-4 -> 2
    5-6 -> 3
    7-8 -> 4
    9-10 -> 5
    """
    if value is None:
        return None
    if value <= 2:
        return 1
    elif value <= 4:
        return 2
    elif value <= 6:
        return 3
    elif value <= 8:
        return 4
    else:
        return 5


def scale_1_10_to_0_3(value):
    """
    Convert a value from 1-10 scale to 0-3 scale.
    1-2 -> 0
    3-5 -> 1
    6-8 -> 2
    9-10 -> 3
    """
    if value is None:
        return None
    if value <= 2:
        return 0
    elif value <= 5:
        return 1
    elif value <= 8:
        return 2
    else:
        return 3


def map_mood_data(dry_run=True):
    """
    Map existing mood entries to new scales.
    
    Args:
        dry_run: If True, only show what would be changed without updating
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🔄 Mood Data Mapping Script")
    print("=" * 60)
    
    try:
        # Get all mood entries
        cursor.execute("""
            SELECT id, date, mood_score, energy_level, stress_level
            FROM mood_entries
        """)
        entries = cursor.fetchall()
        
        print(f"\n📊 Found {len(entries)} mood entries to process")
        
        if len(entries) == 0:
            print("✅ No entries to process")
            return
        
        # Show sample of current data
        print("\n📋 Sample of current data (first 5 entries):")
        for entry in entries[:5]:
            entry_id, date, mood, energy, stress = entry
            print(f"   ID {entry_id} ({date}): mood={mood}, energy={energy}, stress={stress}")
        
        # Calculate new values
        updates = []
        for entry in entries:
            entry_id, date, mood, energy, stress = entry
            
            new_mood = scale_1_10_to_1_5(mood)
            new_energy = scale_1_10_to_1_5(energy)
            new_stress = scale_1_10_to_0_3(stress)
            
            updates.append({
                'id': entry_id,
                'date': date,
                'old_mood': mood,
                'new_mood': new_mood,
                'old_energy': energy,
                'new_energy': new_energy,
                'old_stress': stress,
                'new_stress': new_stress
            })
        
        # Show sample of new values
        print("\n📊 Sample of new values (first 5 entries):")
        for update in updates[:5]:
            print(f"   ID {update['id']} ({update['date']}):")
            print(f"      mood: {update['old_mood']} -> {update['new_mood']}")
            print(f"      energy: {update['old_energy']} -> {update['new_energy']}")
            print(f"      stress: {update['old_stress']} -> {update['new_stress']}")
        
        if dry_run:
            print("\n⚠️  DRY RUN MODE - No changes made")
            print("   Run with --commit flag to apply changes")
        else:
            print("\n💾 Applying changes...")
            for update in updates:
                cursor.execute("""
                    UPDATE mood_entries
                    SET mood_score = ?,
                        energy_level = ?,
                        stress_level = ?
                    WHERE id = ?
                """, (
                    update['new_mood'],
                    update['new_energy'],
                    update['new_stress'],
                    update['id']
                ))
            
            conn.commit()
            print(f"✅ Updated {len(updates)} entries successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during mapping: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    """Main function."""
    auto_commit = "--commit" in sys.argv
    
    print(f"\n📂 Database: {DB_PATH}\n")
    
    print("⚠️  IMPORTANT: This script will convert mood scores to new scales:")
    print("   - Mood (1-10 -> 1-5)")
    print("   - Energy (1-10 -> 1-5)")
    print("   - Stress (1-10 -> 0-3)")
    print()
    print("   Conversion mapping:")
    print("   1-10 to 1-5: 1-2->1, 3-4->2, 5-6->3, 7-8->4, 9-10->5")
    print("   1-10 to 0-3: 1-2->0, 3-5->1, 6-8->2, 9-10->3")
    print()
    
    if auto_commit:
        print("💾 --commit flag provided, changes will be applied")
        map_mood_data(dry_run=False)
    else:
        print("🔍 Running in DRY RUN mode (use --commit to apply changes)")
        map_mood_data(dry_run=True)
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()

