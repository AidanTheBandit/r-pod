#!/bin/bash

# 🎵 Music Aggregator Cleanup Script
# This script removes development files and optimizes for production deployment

set -e

echo "🧹 Starting cleanup process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend-python" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "📁 Working in: $(pwd)"

# Remove development dependencies and cache
print_status "Removing Node.js development cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .npm 2>/dev/null || true

# Remove Python cache files
print_status "Removing Python cache files..."
find backend-python -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find backend-python -name "*.pyc" -delete 2>/dev/null || true
find backend-python -name "*.pyo" -delete 2>/dev/null || true
find backend-python -name "*.pyd" -delete 2>/dev/null || true

# Remove log files
print_status "Removing log files..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.temp" -delete 2>/dev/null || true

# Remove OS-specific files
print_status "Removing OS-specific files..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true
find . -name "desktop.ini" -delete 2>/dev/null || true

# Remove Git history (optional - ask user)
if [ -d ".git" ]; then
    echo ""
    read -p "🤔 Remove Git history to reduce size? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing Git history..."
        rm -rf .git
    else
        print_warning "Keeping Git history"
    fi
fi

# Remove development documentation (keep essential docs)
print_status "Cleaning up documentation..."
# Keep: README.md, SETUP.md
# Remove development docs that aren't needed in production
rm -f DEVELOPMENT.md 2>/dev/null || true
rm -f CONTRIBUTING.md 2>/dev/null || true
rm -f CHANGELOG.md 2>/dev/null || true
rm -f TODO.md 2>/dev/null || true

# Remove example/test files
print_status "Removing example and test files..."
find . -name "*.example" -delete 2>/dev/null || true
find . -name "*.sample" -delete 2>/dev/null || true
find . -name "test*" -type f -delete 2>/dev/null || true
find . -name "*test*" -type f -delete 2>/dev/null || true

# Remove IDE/editor files
print_status "Removing IDE/editor files..."
rm -rf .vscode 2>/dev/null || true
rm -rf .idea 2>/dev/null || true
rm -f .editorconfig 2>/dev/null || true
rm -f .eslintrc* 2>/dev/null || true
rm -f .prettierrc* 2>/dev/null || true
rm -f tsconfig.json 2>/dev/null || true
rm -f jsconfig.json 2>/dev/null || true

# Remove Docker files if not using Docker
if [ ! -f "docker-compose.yml" ] && [ ! -f "Dockerfile" ]; then
    print_warning "No Docker files found - skipping Docker cleanup"
else
    echo ""
    read -p "🐳 Remove Docker files if not using Docker? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing Docker files..."
        rm -f docker-compose*.yml 2>/dev/null || true
        rm -f Dockerfile* 2>/dev/null || true
        rm -f docker-compose*.yaml 2>/dev/null || true
        rm -f .dockerignore 2>/dev/null || true
    fi
fi

# Optimize package.json for production
print_status "Optimizing package.json for production..."
if command -v jq &> /dev/null; then
    # Remove devDependencies from package.json
    jq 'del(.devDependencies)' package.json > package.json.tmp && mv package.json.tmp package.json
    print_status "Removed devDependencies from package.json"
else
    print_warning "jq not found - skipping package.json optimization"
fi

# Create production requirements.txt for Python
print_status "Creating optimized Python requirements..."
if [ -f "backend-python/requirements.txt" ]; then
    # Remove development packages
    sed '/^#/d; /^$/d; /test/d; /dev/d; /lint/d; /doc/d' backend-python/requirements.txt > backend-python/requirements-prod.txt
    mv backend-python/requirements-prod.txt backend-python/requirements.txt
    print_status "Optimized Python requirements.txt"
fi

# Compress remaining files (optional)
echo ""
read -p "🗜️  Compress static files for better performance? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "dist" ]; then
        print_status "Compressing built assets..."
        find dist -name "*.js" -exec gzip -9 {} \; -exec mv {}.gz {} \;
        find dist -name "*.css" -exec gzip -9 {} \; -exec mv {}.gz {} \;
        print_status "Static files compressed"
    else
        print_warning "No dist directory found - run 'npm run build' first"
    fi
fi

# Show disk usage before and after
echo ""
print_status "Cleanup completed!"
echo ""
echo "📊 Disk usage summary:"
du -sh . 2>/dev/null || echo "Could not calculate disk usage"

echo ""
print_status "Next steps:"
echo "  1. Run 'npm install --production' to install only production dependencies"
echo "  2. Run 'npm run build' to create production build"
echo "  3. Run 'npm run host-both' to start production servers"
echo "  4. Configure your reverse proxy (nginx/caddy)"
echo "  5. Set up SSL certificates"
echo "  6. Configure backups and monitoring"

echo ""
print_warning "Remember to:"
echo "  - Change the default password in backend-python/config.py"
echo "  - Set up HTTPS in production"
echo "  - Configure firewall rules"
echo "  - Set up log rotation"
echo "  - Configure backups"

echo ""
print_status "Cleanup script completed successfully! 🎵"</content>
<parameter name="filePath">/Users/aidanpds/Downloads/r1-ipod-ui-plugin/cleanup.sh