#!/usr/bin/env python3
"""
Quick script to preview all existing mood entries and what they will become after mapping.
This helps you verify the mapping is correct before committing.
"""
import sqlite3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "../data/habits_tracker.db"


def scale_1_10_to_1_5(value):
    """Convert 1-10 to 1-5."""
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
    """Convert 1-10 to 0-3."""
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


def preview_mapping():
    """Show a preview of all entries and their new values."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, date, mood_score, energy_level, stress_level, notes
        FROM mood_entries
        ORDER BY date DESC
    """)
    
    entries = cursor.fetchall()
    conn.close()
    
    print("\n" + "=" * 80)
    print("📊 MOOD DATA MAPPING PREVIEW")
    print("=" * 80)
    print(f"\nTotal entries: {len(entries)}\n")
    
    if len(entries) == 0:
        print("No entries to preview.")
        return
    
    for entry in entries:
        entry_id, date, mood, energy, stress, notes = entry
        
        new_mood = scale_1_10_to_1_5(mood)
        new_energy = scale_1_10_to_1_5(energy)
        new_stress = scale_1_10_to_0_3(stress)
        
        print(f"Entry #{entry_id} - {date}")
        print(f"  Mood:    {mood:2}/10  →  {new_mood}/5")
        print(f"  Energy:  {energy:2}/10  →  {new_energy}/5")
        print(f"  Stress:  {stress:2}/10  →  {new_stress}/3")
        if notes:
            print(f"  Notes: {notes[:60]}...")
        print()
    
    print("=" * 80)
    print("\n💡 If this mapping looks correct, run:")
    print("   python map_mood_data.py --commit")
    print("\n💡 To modify the mapping, update the scale conversion functions in:")
    print("   map_mood_data.py")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    preview_mapping()

