#!/bin/bash
# Backend startup script for cross-shell compatibility

cd backend-python

# Try different activation methods
if command -v activate &> /dev/null; then
    # Some systems have activate in PATH
    activate
elif [ -f "venv/bin/activate" ]; then
    # Linux/Mac standard
    . venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    # Windows
    . venv/Scripts/activate
else
    echo "Virtual environment not found. Run setup.sh first."
    exit 1
fi

# Set port and start server
export PORT=${PORT:-3451}
exec python main.py