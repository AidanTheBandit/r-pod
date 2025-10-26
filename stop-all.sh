#!/bin/bash

# R-Pod Stop All Services Script

set -e

echo "🛑 Stopping all R-Pod services..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Stop processes by PID files
if [ -f backend.pid ]; then
    PID=$(cat backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        print_status "Backend stopped (PID: $PID)"
    fi
    rm backend.pid
fi

if [ -f frontend.pid ]; then
    PID=$(cat frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        print_status "Frontend stopped (PID: $PID)"
    fi
    rm frontend.pid
fi

if [ -f pairing.pid ]; then
    PID=$(cat pairing.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        print_status "Pairing client stopped (PID: $PID)"
    fi
    rm pairing.pid
fi

# Fallback: kill by port
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

print_status "All services stopped"
print_info "Log files preserved (backend.log, frontend.log, pairing.log)"
