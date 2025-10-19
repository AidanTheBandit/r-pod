#!/bin/bash

# Production Build Script for Universal Music Aggregator

echo "🚀 Building Universal Music Aggregator for Production"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build frontend
echo "📦 Building frontend..."
cd "$SCRIPT_DIR"
npm run build

# Build backend (if needed)
echo "🔧 Checking backend..."
cd "$SCRIPT_DIR/backend-python"
if [ -f "requirements.txt" ]; then
    echo "Python backend detected - ensure dependencies are installed"
    echo "Run: pip install -r requirements.txt"
fi

echo "✅ Build complete!"
echo ""
echo "To deploy:"
echo "1. Copy the 'dist' folder to your web server"
echo "2. Start the backend: python main.py (from backend-python directory)"
echo "3. Configure your reverse proxy to serve the frontend and proxy API calls to the backend"
echo ""
echo "Environment variables needed:"
echo "- VITE_BACKEND_URL: Your backend server URL"
echo "- VITE_BACKEND_PASSWORD: Server authentication password"