#!/bin/bash

# Lavalink Setup Script for iPod Music App

set -e

echo "🎵 Setting up Lavalink for iPod Music App..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed!"
    echo "Please install Java 17 or higher:"
    echo "  macOS: brew install openjdk@17"
    echo "  Ubuntu: sudo apt install openjdk-17-jre"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
echo "✓ Java version: $JAVA_VERSION"

# Create lavalink directory
mkdir -p lavalink
cd lavalink

# Download Lavalink if not exists
if [ ! -f "Lavalink.jar" ]; then
    echo "📥 Downloading Lavalink..."
    curl -L -o Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/download/4.0.7/Lavalink.jar
    echo "✓ Lavalink downloaded"
else
    echo "✓ Lavalink.jar already exists"
fi

# Copy application.yml if not exists
if [ ! -f "application.yml" ]; then
    if [ -f "../application.yml" ]; then
        cp ../application.yml ./application.yml
        echo "✓ Copied application.yml"
    else
        echo "❌ application.yml not found in backend directory"
        exit 1
    fi
fi

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Lavalink setup complete!"
echo ""
echo "To start Lavalink:"
echo "  cd backend/lavalink"
echo "  java -jar Lavalink.jar"
echo ""
echo "Lavalink will run on: http://localhost:2333"
echo "Password: music-aggregator-2025"
