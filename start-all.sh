#!/bin/bash

# R-Pod Complete Startup Script
# Builds and runs all components for testing

set -e  # Exit on error

echo "===================================="
echo "🎵 R-Pod Complete Startup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check for required tools
echo "Checking required tools..."
MISSING_TOOLS=()

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("node")
fi

if ! command -v npm &> /dev/null; then
    MISSING_TOOLS+=("npm")
fi

if ! command -v python3 &> /dev/null; then
    MISSING_TOOLS+=("python3")
fi

if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    MISSING_TOOLS+=("pip")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    print_error "Missing required tools: ${MISSING_TOOLS[*]}"
    exit 1
fi

print_status "All required tools found"
echo ""

# Check if .env exists
if [ ! -f "backend-python/.env" ]; then
    print_warning ".env file not found in backend-python/"
    print_info "Creating template .env file..."
    cat > backend-python/.env << 'EOF'
# Server Configuration
SERVER_PASSWORD=change-me-in-production
HOST=0.0.0.0
PORT=8000
DEBUG=true

# YouTube Music (Optional - can be configured via pairing)
YOUTUBE_MUSIC_COOKIE=
YOUTUBE_MUSIC_PROFILE=0
YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=

# Spotify (Optional)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# CORS
CORS_ORIGINS=["*"]

# Cache
CACHE_TTL=300
SESSION_TIMEOUT=3600
SESSION_CLEANUP_INTERVAL=300
EOF
    print_warning "Please edit backend-python/.env with your settings"
    print_info "You can use the pairing system to configure YTM credentials"
fi

# Install backend dependencies
echo ""
echo "===================================="
echo "📦 Installing Backend Dependencies"
echo "===================================="
cd backend-python

if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
fi

print_info "Activating virtual environment..."
source venv/bin/activate

print_info "Installing Python packages..."
pip install -r requirements.txt --quiet
print_status "Backend dependencies installed"

# Check for ffmpeg (required for lyrics transcription)
if ! command -v ffmpeg &> /dev/null; then
    print_warning "ffmpeg not found - lyrics transcription will not work"
    print_info "Install with: sudo apt-get install ffmpeg"
else
    print_status "ffmpeg found"
fi

cd ..

# Install frontend dependencies
echo ""
echo "===================================="
echo "📦 Installing Frontend Dependencies"
echo "===================================="
print_info "Installing npm packages..."
npm install --silent
print_status "Frontend dependencies installed"

# Install pairing client dependencies
echo ""
echo "===================================="
echo "📦 Installing Pairing Client Dependencies"
echo "===================================="
cd pairing-client
if [ ! -d "node_modules" ]; then
    print_info "Installing pairing client npm packages..."
    npm install --silent
    print_status "Pairing client dependencies installed"
else
    print_status "Pairing client dependencies already installed"
fi
cd ..

# Build frontend
echo ""
echo "===================================="
echo "🔨 Building Frontend"
echo "===================================="
print_info "Building React app..."
npm run build
print_status "Frontend built successfully"

# Build pairing client
echo ""
echo "===================================="
echo "🔨 Building Pairing Client"
echo "===================================="
cd pairing-client
print_info "Building pairing client..."
npm run build
print_status "Pairing client built successfully"
cd ..

# Start backend
echo ""
echo "===================================="
echo "🚀 Starting Services"
echo "===================================="

# Kill any existing processes on our ports
print_info "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend in background
print_info "Starting backend server (port 8000)..."
cd backend-python
source venv/bin/activate
nohup python main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..
print_status "Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
MAX_TRIES=30
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend is ready!"
        break
    fi
    TRIES=$((TRIES + 1))
    sleep 1
done

if [ $TRIES -eq $MAX_TRIES ]; then
    print_error "Backend failed to start"
    print_info "Check backend.log for errors"
    exit 1
fi

# Start frontend dev server
print_info "Starting frontend dev server (port 5173)..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid
print_status "Frontend started (PID: $FRONTEND_PID)"

# Start pairing client dev server
print_info "Starting pairing client (port 3000)..."
cd pairing-client
nohup npm run dev -- --port 3000 > ../pairing.log 2>&1 &
PAIRING_PID=$!
echo $PAIRING_PID > ../pairing.pid
cd ..
print_status "Pairing client started (PID: $PAIRING_PID)"

# Wait for frontend to be ready
print_info "Waiting for frontend to be ready..."
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_status "Frontend is ready!"
        break
    fi
    TRIES=$((TRIES + 1))
    sleep 1
done

# Summary
echo ""
echo "===================================="
echo "✅ All Services Running!"
echo "===================================="
echo ""
print_status "Backend API: http://localhost:8000"
print_status "Frontend (R1): http://localhost:5173"
print_status "Pairing Client: http://localhost:3000"
echo ""
print_info "API Health: http://localhost:8000/health"
print_info "API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
print_info "Backend: tail -f backend.log"
print_info "Frontend: tail -f frontend.log"
print_info "Pairing: tail -f pairing.log"
echo ""
echo "To stop all services: ./stop-all.sh"
echo ""
print_warning "Press Ctrl+C to stop watching logs (services will keep running)"
echo ""

# Follow logs
tail -f backend.log frontend.log pairing.log
