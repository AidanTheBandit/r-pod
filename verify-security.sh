#!/bin/bash
# Security Verification Script for R-Pod
# This script checks that sensitive credentials are not exposed

set -e

echo "🔒 R-Pod Security Verification"
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to print errors
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to print warnings
warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "1. Checking .gitignore configuration..."
echo "----------------------------------------"

if [ -f .gitignore ]; then
    # Check for essential entries
    if grep -q "^\.env$" .gitignore; then
        success ".env is ignored"
    else
        error ".env is NOT in .gitignore"
    fi
    
    if grep -q "^\.env\.local$" .gitignore; then
        success ".env.local is ignored"
    else
        error ".env.local is NOT in .gitignore"
    fi
    
    if grep -q "^headers_auth\.json$" .gitignore; then
        success "headers_auth.json is ignored"
    else
        error "headers_auth.json is NOT in .gitignore"
    fi
else
    error ".gitignore file not found!"
fi

echo ""
echo "2. Checking for accidentally tracked credentials..."
echo "---------------------------------------------------"

# Check if .env files are tracked by git
if git ls-files --error-unmatch .env 2>/dev/null; then
    error ".env is tracked by git!"
else
    success ".env is not tracked by git"
fi

if git ls-files --error-unmatch .env.local 2>/dev/null; then
    error ".env.local is tracked by git!"
else
    success ".env.local is not tracked by git"
fi

if git ls-files --error-unmatch backend-python/.env 2>/dev/null; then
    error "backend-python/.env is tracked by git!"
else
    success "backend-python/.env is not tracked by git"
fi

if git ls-files --error-unmatch backend-python/headers_auth.json 2>/dev/null; then
    error "backend-python/headers_auth.json is tracked by git!"
else
    success "backend-python/headers_auth.json is not tracked by git"
fi

echo ""
echo "3. Checking environment file configuration..."
echo "----------------------------------------------"

# Check if .env files exist
if [ -f backend-python/.env ]; then
    success "Backend .env file exists"
    
    # Check for secure password
    if grep -q "^SERVER_PASSWORD=change-me" backend-python/.env; then
        error "SERVER_PASSWORD is still set to default 'change-me'"
    elif grep -q "^SERVER_PASSWORD=.*" backend-python/.env; then
        PASSWORD=$(grep "^SERVER_PASSWORD=" backend-python/.env | cut -d'=' -f2)
        if [ ${#PASSWORD} -lt 16 ]; then
            warning "SERVER_PASSWORD is shorter than 16 characters"
        else
            success "SERVER_PASSWORD is configured and sufficiently long"
        fi
    else
        error "SERVER_PASSWORD is not set in backend-python/.env"
    fi
else
    warning "Backend .env file not found (copy from .env.example)"
fi

if [ -f .env.local ]; then
    success "Frontend .env.local file exists"
    
    # Check if passwords match
    if [ -f backend-python/.env ]; then
        BACKEND_PASS=$(grep "^SERVER_PASSWORD=" backend-python/.env | cut -d'=' -f2)
        FRONTEND_PASS=$(grep "^VITE_BACKEND_PASSWORD=" .env.local | cut -d'=' -f2)
        
        if [ "$BACKEND_PASS" = "$FRONTEND_PASS" ]; then
            success "Frontend and backend passwords match"
        else
            error "Frontend and backend passwords DO NOT match"
        fi
    fi
else
    warning "Frontend .env.local file not found (copy from .env.example)"
fi

echo ""
echo "4. Checking file permissions..."
echo "--------------------------------"

if [ -f backend-python/.env ]; then
    PERMS=$(stat -c %a backend-python/.env 2>/dev/null || stat -f %A backend-python/.env 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        success "backend-python/.env has secure permissions ($PERMS)"
    else
        warning "backend-python/.env permissions are $PERMS (recommended: 600)"
        echo "    Run: chmod 600 backend-python/.env"
    fi
fi

if [ -f .env.local ]; then
    PERMS=$(stat -c %a .env.local 2>/dev/null || stat -f %A .env.local 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        success ".env.local has secure permissions ($PERMS)"
    else
        warning ".env.local permissions are $PERMS (recommended: 600)"
        echo "    Run: chmod 600 .env.local"
    fi
fi

if [ -f backend-python/headers_auth.json ]; then
    PERMS=$(stat -c %a backend-python/headers_auth.json 2>/dev/null || stat -f %A backend-python/headers_auth.json 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        success "headers_auth.json has secure permissions ($PERMS)"
    else
        warning "headers_auth.json permissions are $PERMS (recommended: 600)"
        echo "    Run: chmod 600 backend-python/headers_auth.json"
    fi
fi

echo ""
echo "5. Scanning source code for hardcoded credentials..."
echo "-----------------------------------------------------"

# Look for potential hardcoded credentials in Python files
FOUND_ISSUES=0

# Check for hardcoded API keys (excluding default InnerTube keys which are public)
if grep -r "api_key.*=.*['\"][A-Za-z0-9_-]\{20,\}['\"]" backend-python/*.py 2>/dev/null | grep -v "DEFAULT_API_KEYS" | grep -v "AIzaSy" | grep -v "os.getenv"; then
    error "Found potential hardcoded API keys in Python code"
    ((FOUND_ISSUES++))
fi

# Check for hardcoded passwords
if grep -r "password.*=.*['\"][^'\"]\\+['\"]" backend-python/*.py 2>/dev/null | grep -v "os.getenv" | grep -v "change-me" | grep -v "your-password"; then
    warning "Found potential hardcoded passwords in Python code"
    ((FOUND_ISSUES++))
fi

# Check for hardcoded cookies
if grep -r "cookie.*=.*['\"][^'\"]\\{100,\\}['\"]" backend-python/*.py 2>/dev/null | grep -v "os.getenv"; then
    error "Found potential hardcoded cookies in Python code"
    ((FOUND_ISSUES++))
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    success "No hardcoded credentials found in source code"
fi

echo ""
echo "6. Checking git history for leaked credentials..."
echo "--------------------------------------------------"

# Check if git-secrets is installed
if command -v git-secrets &> /dev/null; then
    echo "Running git-secrets scan..."
    if git secrets --scan-history; then
        success "No secrets found in git history"
    else
        error "Potential secrets found in git history!"
        echo "    See SECURITY.md for how to clean git history"
    fi
else
    warning "git-secrets not installed (recommended for production)"
    echo "    Install: brew install git-secrets (Mac) or pip install git-secrets"
fi

echo ""
echo "================================"
echo "Security Verification Complete"
echo "================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All security checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found. Please review.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found!${NC}"
    echo ""
    echo "Please fix the errors above before deploying to production."
    echo "See SECURITY.md for detailed guidance."
    exit 1
fi
