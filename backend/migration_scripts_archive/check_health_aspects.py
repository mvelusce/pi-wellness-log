#!/usr/bin/env python3
"""
Script to check existing health aspects in the database.
"""
import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DB_PATH = "../data/habits_tracker.db"

def check_health_aspects():
    """Display all health aspects and their entries."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🏥 Health Aspects in Database")
    print("=" * 60)
    
    # Get all health aspects
    cursor.execute("""
        SELECT id, name, category, is_positive
        FROM health_aspects
        ORDER BY name
    """)
    
    aspects = cursor.fetchall()
    
    print(f"\nTotal health aspects: {len(aspects)}\n")
    
    for aspect in aspects:
        aspect_id, name, category, is_positive = aspect
        
        # Count entries for this aspect
        cursor.execute("""
            SELECT COUNT(*) 
            FROM health_aspect_entries 
            WHERE aspect_id = ? AND severity > 0
        """, (aspect_id,))
        entry_count = cursor.fetchone()[0]
        
        pos_neg = "✅ Positive" if is_positive else "⚠️ Negative"
        print(f"ID {aspect_id:3}: {name:30} ({category:15}) {pos_neg} - {entry_count} entries")
    
    print("\n" + "=" * 60)
    
    # Show sample entries
    print("\n📊 Sample Health Aspect Entries (last 10):")
    print("=" * 60)
    
    cursor.execute("""
        SELECT hae.date, ha.name, hae.severity
        FROM health_aspect_entries hae
        JOIN health_aspects ha ON hae.aspect_id = ha.id
        WHERE hae.severity > 0
        ORDER BY hae.date DESC
        LIMIT 10
    """)
    
    entries = cursor.fetchall()
    
    for entry in entries:
        date, name, severity = entry
        print(f"{date}: {name:30} (severity: {severity})")
    
    print("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    check_health_aspects()

