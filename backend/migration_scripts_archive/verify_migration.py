#!/usr/bin/env python3
"""
Verify the migration was successful by checking the data.
"""
import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "../data/habits_tracker.db"


def verify_migration():
    """Verify the migration results."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION VERIFICATION")
    print("=" * 80)
    
    # Count total mood entries
    cursor.execute("SELECT COUNT(*) FROM mood_entries")
    total_entries = cursor.fetchone()[0]
    
    print(f"\n📊 Total mood entries: {total_entries}")
    
    # Count entries with each field populated
    fields = [
        ('anxiety_level', 0, 3),
        ('rumination_level', 0, 3),
        ('anger_level', 0, 3),
        ('sleep_quality', 0, 3),
        ('sweating_level', 0, 3),
        ('general_health', 0, 5),
        ('libido_level', 0, 3),
    ]
    
    print("\n📈 Field population statistics:")
    for field_name, min_val, max_val in fields:
        cursor.execute(f"SELECT COUNT(*) FROM mood_entries WHERE {field_name} IS NOT NULL")
        populated = cursor.fetchone()[0]
        
        cursor.execute(f"SELECT COUNT(*) FROM mood_entries WHERE {field_name} > 0")
        non_zero = cursor.fetchone()[0]
        
        print(f"   {field_name:20} (0-{max_val}): {populated:4} populated, {non_zero:4} non-zero")
    
    # Show recent entries with all fields
    print("\n📋 Recent mood entries (last 10 with any health data):")
    print("-" * 80)
    
    cursor.execute("""
        SELECT date, mood_score, energy_level, stress_level,
               anxiety_level, rumination_level, anger_level,
               general_health, sleep_quality, sweating_level, libido_level
        FROM mood_entries
        WHERE anxiety_level IS NOT NULL 
           OR rumination_level IS NOT NULL
           OR anger_level IS NOT NULL
           OR sleep_quality IS NOT NULL
           OR sweating_level IS NOT NULL
           OR general_health IS NOT NULL
           OR libido_level IS NOT NULL
        ORDER BY date DESC
        LIMIT 10
    """)
    
    entries = cursor.fetchall()
    
    for entry in entries:
        date, mood, energy, stress, anxiety, rumination, anger, health, sleep, sweat, libido = entry
        print(f"\n{date}:")
        print(f"  Mood: {mood}/5, Energy: {energy}/5, Stress: {stress}/3")
        if anxiety: print(f"  Anxiety: {anxiety}/3")
        if rumination: print(f"  Rumination: {rumination}/3")
        if anger: print(f"  Anger: {anger}/3")
        if health is not None: print(f"  Health: {health}/5")
        if sleep is not None: print(f"  Sleep: {sleep}/3")
        if sweat: print(f"  Sweat: {sweat}/3")
        if libido is not None: print(f"  Libido: {libido}/3")
    
    # Check scale ranges
    print("\n" + "=" * 80)
    print("🔍 Checking scale ranges...")
    
    issues = []
    
    # Check mood_score (should be 1-5)
    cursor.execute("SELECT COUNT(*) FROM mood_entries WHERE mood_score < 1 OR mood_score > 5")
    if cursor.fetchone()[0] > 0:
        issues.append("❌ Found mood_score values outside 1-5 range")
    else:
        print("   ✅ mood_score: All values in 1-5 range")
    
    # Check energy_level (should be 1-5 or NULL)
    cursor.execute("SELECT COUNT(*) FROM mood_entries WHERE energy_level IS NOT NULL AND (energy_level < 1 OR energy_level > 5)")
    if cursor.fetchone()[0] > 0:
        issues.append("❌ Found energy_level values outside 1-5 range")
    else:
        print("   ✅ energy_level: All values in 1-5 range or NULL")
    
    # Check stress_level (should be 0-3 or NULL)
    cursor.execute("SELECT COUNT(*) FROM mood_entries WHERE stress_level IS NOT NULL AND (stress_level < 0 OR stress_level > 3)")
    if cursor.fetchone()[0] > 0:
        issues.append("❌ Found stress_level values outside 0-3 range")
    else:
        print("   ✅ stress_level: All values in 0-3 range or NULL")
    
    # Check other fields (0-3 or NULL)
    for field in ['anxiety_level', 'rumination_level', 'anger_level', 'sleep_quality', 'sweating_level', 'libido_level']:
        cursor.execute(f"SELECT COUNT(*) FROM mood_entries WHERE {field} IS NOT NULL AND ({field} < 0 OR {field} > 3)")
        if cursor.fetchone()[0] > 0:
            issues.append(f"❌ Found {field} values outside 0-3 range")
        else:
            print(f"   ✅ {field}: All values in 0-3 range or NULL")
    
    # Check general_health (0-5 or NULL)
    cursor.execute("SELECT COUNT(*) FROM mood_entries WHERE general_health IS NOT NULL AND (general_health < 0 OR general_health > 5)")
    if cursor.fetchone()[0] > 0:
        issues.append("❌ Found general_health values outside 0-5 range")
    else:
        print("   ✅ general_health: All values in 0-5 range or NULL")
    
    if issues:
        print("\n⚠️  Issues found:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("\n✅ All scale ranges are correct!")
    
    print("\n" + "=" * 80)
    print("✅ VERIFICATION COMPLETE")
    print("=" * 80 + "\n")
    
    conn.close()


if __name__ == "__main__":
    verify_migration()

