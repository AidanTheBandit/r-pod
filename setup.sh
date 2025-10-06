#!/bin/bash

# 🎵 Music Aggregator Setup Script
# Automated setup for production deployment

set -e

echo "🚀 Starting Music Aggregator Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check system requirements
print_info "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"
if ! [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to 18+."
    exit 1
fi
print_status "Node.js $NODE_VERSION found"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | sed 's/Python //')
REQUIRED_PYTHON="3.8.0"
if ! [ "$(printf '%s\n' "$REQUIRED_PYTHON" "$PYTHON_VERSION" | sort -V | head -n1)" = "$REQUIRED_PYTHON" ]; then
    print_error "Python version $PYTHON_VERSION is too old. Please upgrade to 3.8+."
    exit 1
fi
print_status "Python $PYTHON_VERSION found"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend-python" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Working in: $(pwd)"

# Setup Python virtual environment
print_info "Setting up Python virtual environment..."
cd backend-python

if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_status "Created Python virtual environment"
else
    print_warning "Virtual environment already exists"
fi

# Activate and install dependencies
print_info "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
print_status "Python dependencies installed"

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in backend-python/"
    print_info "Creating basic .env file..."
    cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=3451
HOST=0.0.0.0

# Security - CHANGE THIS PASSWORD!
SERVER_PASSWORD=change-me-in-production-please

# YouTube Music (Required)
YOUTUBE_MUSIC_COOKIE=your-youtube-music-cookie-here
YOUTUBE_MUSIC_PROFILE=1
YOUTUBE_MUSIC_BRAND_ACCOUNT_ID=

# Optional Services
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
JELLYFIN_SERVER_URL=
JELLYFIN_API_KEY=

# Cache Settings
CACHE_TTL=3600

# CORS (Allow all for internet hosting)
CORS_ORIGINS=["*"]
EOF
    print_status "Created basic .env file - PLEASE EDIT IT WITH YOUR SETTINGS"
else
    print_status ".env file already exists"
fi

cd ..

# Setup YouTube PO Token Provider (Required for October 2025+)
print_info "Setting up YouTube PO Token Provider..."
if command -v docker &> /dev/null; then
    if ! docker ps -a --format 'table {{.Names}}' | grep -q "^youtube-po-token-provider$"; then
        print_info "Starting YouTube PO Token Provider..."
        docker run --name youtube-po-token-provider -d -p 4416:4416 --init brainicism/bgutil-ytdlp-pot-provider
        print_status "YouTube PO Token Provider started"
    else
        print_warning "YouTube PO Token Provider already running"
    fi
else
    print_warning "Docker not found. Please install Docker and run:"
    print_info "docker run --name youtube-po-token-provider -d -p 4416:4416 --init brainicism/bgutil-ytdlp-pot-provider"
fi

cd backend-python

# Setup Node.js dependencies
print_info "Installing Node.js dependencies..."
npm install
print_status "Node.js dependencies installed"

# Create frontend environment file
if [ ! -f ".env.local" ]; then
    print_info "Creating frontend environment file..."
    cat > .env.local << EOF
# Backend Configuration (leave empty for manual entry)
VITE_BACKEND_URL=
VITE_BACKEND_PASSWORD=change-me-in-production-please
EOF
    print_status "Created .env.local file - PLEASE EDIT IT WITH YOUR SETTINGS"
else
    print_status ".env.local file already exists"
fi

# Test build
print_info "Testing production build..."
npm run build
print_status "Production build successful"

# Create startup script
print_info "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "🎵 Starting Music Aggregator..."

# Start backend
echo "Starting backend..."
cd backend-python
source venv/bin/activate
PORT=3451 python main.py &
BACKEND_PID=$!

cd ..

# Start frontend
echo "Starting frontend..."
npm run preview -- --port 3450 --host &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "📱 Frontend: http://localhost:3450"
echo "🖥️  Backend: http://localhost:3451"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
EOF

chmod +x start.sh
print_status "Created start.sh script"

echo ""
print_status "Setup completed successfully!"
echo ""
print_info "Next steps:"
echo "  1. Edit backend-python/.env with your YouTube Music cookie and change the password"
echo "  2. Edit .env.local with your backend password"
echo "  3. Add your icon.png to the public/ directory (replaces the placeholder)"
echo "  4. Run './start.sh' to test locally"
echo "  5. Run './cleanup.sh' to optimize for production"
echo "  6. Follow SELF_HOSTING_GUIDE.md for production deployment"
echo ""
print_warning "Important security reminders:"
echo "  - Change the default password from 'change-me-in-production-please'"
echo "  - Get your YouTube Music cookie (see SELF_HOSTING_GUIDE.md)"
echo "  - YouTube PO Token Provider is running (required for October 2025+)"
echo "  - Set up HTTPS in production"
echo "  - Configure firewall rules"
echo ""
print_status "Happy listening! 🎵"</content>
<parameter name="filePath">/Users/aidanpds/Downloads/r1-ipod-ui-plugin/setup.sh