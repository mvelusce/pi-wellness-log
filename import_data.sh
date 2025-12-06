#!/bin/bash

# Import legacy data script
# This script imports your old habit data from CSV files

echo "🎯 Habits Tracker - Legacy Data Import"
echo "======================================"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if CSV files exist
if [ ! -f "$PROJECT_ROOT/data/Habits.csv" ]; then
    echo "❌ Error: data/Habits.csv not found"
    echo "   Please place your Habits.csv file in the data/ directory"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/data/Checkmarks.csv" ]; then
    echo "❌ Error: data/Checkmarks.csv not found"
    echo "   Please place your Checkmarks.csv file in the data/ directory"
    exit 1
fi

echo "✅ Found CSV files:"
echo "   - data/Habits.csv"
echo "   - data/Checkmarks.csv"
echo ""

# Ask about archived habits
read -p "Import checkmarks for archived habits too? (y/N): " include_archived

# Navigate to backend directory
cd "$PROJECT_ROOT/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv --without-pip
    curl -sSL https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    venv/bin/python get-pip.py
    rm get-pip.py
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install requirements if needed
if ! python -c "import sqlalchemy" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -q -r requirements.txt
fi

# Set DATABASE_URL to use the data directory (Docker-compatible)
export DATABASE_URL="sqlite:///$PROJECT_ROOT/data/habits_tracker.db"

# Run import script
echo ""
echo "🚀 Starting import..."
echo "   Database: $DATABASE_URL"
echo ""

if [ "$include_archived" = "y" ] || [ "$include_archived" = "Y" ]; then
    python import_legacy_data.py --habits="$PROJECT_ROOT/data/Habits.csv" --checkmarks="$PROJECT_ROOT/data/Checkmarks.csv" --include-archived
else
    python import_legacy_data.py --habits="$PROJECT_ROOT/data/Habits.csv" --checkmarks="$PROJECT_ROOT/data/Checkmarks.csv"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Import completed successfully!"
    echo ""
    echo "📊 Database location: $PROJECT_ROOT/data/habits_tracker.db"
    echo ""
    echo "You can now:"
    echo "  - Start the app: docker-compose up"
    echo "  - View your habits at: http://localhost:3000"
    echo ""
else
    echo ""
    echo "❌ Import failed. Please check the error messages above."
    exit 1
fi

