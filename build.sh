#!/bin/bash

# Production Build Script for Universal Music Aggregator

echo "🚀 Building Universal Music Aggregator for Production"

# Build frontend
echo "📦 Building frontend..."
cd /Users/aidanpds/Downloads/r1-ipod-ui-plugin/ipod-music-app
npm run build

# Build backend
echo "🔧 Building backend..."
cd backend
npm run build 2>/dev/null || echo "No build script for backend (ESM modules)"

echo "✅ Build complete!"
echo ""
echo "To deploy:"
echo "1. Copy the 'dist' folder to your web server"
echo "2. Start the backend: node backend/server.js"
echo "3. Configure your reverse proxy to serve the frontend and proxy API calls to the backend"
echo ""
echo "Environment variables needed:"
echo "- VITE_BACKEND_URL: Your backend server URL"
echo "- VITE_BACKEND_PASSWORD: Server authentication password"