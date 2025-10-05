#!/bin/bash

# iPod Music Backend - Python Edition
# Quick start script

set -e

echo "=================================================="
echo "iPod Music Backend - Python Edition Setup"
echo "=================================================="
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Found Python $PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  No .env file found"
    echo "Creating .env from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and set:"
    echo "   - SERVER_PASSWORD"
    echo "   - YOUTUBE_MUSIC_COOKIE"
    echo "   - Other service credentials (optional)"
    echo ""
    read -p "Press Enter to edit .env now, or Ctrl+C to exit and edit manually..."
    ${EDITOR:-nano} .env
fi

echo ""
echo "=================================================="
echo "Setup complete!"
echo "=================================================="
echo ""
echo "To start the server:"
echo "  source venv/bin/activate  # Activate virtual environment"
echo "  python main.py            # Start the server"
echo ""
echo "Or use Docker:"
echo "  docker-compose up -d      # Start in background"
echo "  docker-compose logs -f    # View logs"
echo ""
echo "Server will run at: http://localhost:3001"
echo "Health check: http://localhost:3001/health"
echo ""
