#!/usr/bin/env python3
"""
Detailed preview of health aspect to mood entry migration.
Shows before/after for dates with existing mood entries.
"""
import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "../data/habits_tracker.db"


def preview_migration():
    """Show detailed preview of migration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "=" * 80)
    print("📊 DETAILED MIGRATION PREVIEW")
    print("=" * 80)
    
    # Find dates that have BOTH mood entries AND health aspects
    cursor.execute("""
        SELECT DISTINCT me.date, me.mood_score, me.energy_level, me.stress_level
        FROM mood_entries me
        WHERE EXISTS (
            SELECT 1 FROM health_aspect_entries hae
            WHERE hae.date = me.date 
              AND hae.aspect_id IN (1, 2, 3, 6, 7, 8, 9, 10, 11)
              AND hae.severity > 0
        )
        ORDER BY me.date DESC
    """)
    
    dates_with_both = cursor.fetchall()
    
    print(f"\n🔍 Found {len(dates_with_both)} dates with BOTH mood entries AND health aspects")
    print("These will be UPDATED:\n")
    
    for date, mood, energy, stress in dates_with_both:
        print(f"\n📅 {date}")
        print(f"   Existing mood entry: mood={mood}, energy={energy}, stress={stress}")
        
        # Get health aspects for this date
        cursor.execute("""
            SELECT ha.name, hae.severity
            FROM health_aspect_entries hae
            JOIN health_aspects ha ON hae.aspect_id = ha.id
            WHERE hae.date = ?
              AND hae.aspect_id IN (1, 2, 3, 6, 7, 8, 9, 10, 11)
              AND hae.severity > 0
            ORDER BY ha.name
        """, (date,))
        
        aspects = cursor.fetchall()
        print(f"   Health aspects to merge:")
        for aspect_name, severity in aspects:
            mapping = {
                'Anxiety': 'anxiety_level = 3',
                'Rumination': 'rumination_level = 3',
                'Anger': 'anger_level = 3',
                'Bad sleep': 'sleep_quality = 0',
                'Good sleep': 'sleep_quality = 3',
                'Sweat problems': 'sweating_level = 3',
                'Sickness': 'general_health = 0',
                'ED': 'libido_level = 0',
                'MME': 'libido_level = 3'
            }
            print(f"      - {aspect_name:20} → {mapping.get(aspect_name, 'unknown')}")
    
    # Show some dates that will CREATE new mood entries
    print("\n" + "=" * 80)
    cursor.execute("""
        SELECT DISTINCT hae.date
        FROM health_aspect_entries hae
        WHERE hae.aspect_id IN (1, 2, 3, 6, 7, 8, 9, 10, 11)
          AND hae.severity > 0
          AND NOT EXISTS (
              SELECT 1 FROM mood_entries me WHERE me.date = hae.date
          )
        ORDER BY hae.date DESC
        LIMIT 10
    """)
    
    dates_to_create = cursor.fetchall()
    
    print(f"\n🆕 Sample of dates that will CREATE new mood entries (showing 10 of many):\n")
    
    for (date,) in dates_to_create:
        cursor.execute("""
            SELECT ha.name
            FROM health_aspect_entries hae
            JOIN health_aspects ha ON hae.aspect_id = ha.id
            WHERE hae.date = ?
              AND hae.aspect_id IN (1, 2, 3, 6, 7, 8, 9, 10, 11)
              AND hae.severity > 0
        """, (date,))
        
        aspects = [row[0] for row in cursor.fetchall()]
        print(f"   {date}: {', '.join(aspects)}")
    
    print("\n" + "=" * 80)
    print("\n💡 To apply this migration, run:")
    print("   python migrate_health_to_mood.py --commit")
    print("=" * 80 + "\n")
    
    conn.close()


if __name__ == "__main__":
    preview_migration()

