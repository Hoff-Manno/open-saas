#!/bin/bash

# Pre-deployment checklist script for PDF Learning SaaS
# Run this script before deploying to Fly.io to ensure everything is configured

echo "🚀 PDF Learning SaaS - Pre-Deployment Checklist"
echo "================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function for check output
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((check_passed++))
    else
        echo -e "${RED}✗${NC} $2"
        ((check_failed++))
    fi
}

echo
echo "1. Checking required tools..."
echo "-----------------------------"

# Check Wasp CLI
if command_exists wasp; then
    wasp_version=$(wasp version 2>/dev/null || echo "unknown")
    check_result 0 "Wasp CLI installed (version: $wasp_version)"
else
    check_result 1 "Wasp CLI not found. Install from https://wasp.sh/docs/installation"
fi

# Check Fly CLI
if command_exists fly; then
    fly_version=$(fly version 2>/dev/null | head -n1 || echo "unknown")
    check_result 0 "Fly CLI installed ($fly_version)"
else
    check_result 1 "Fly CLI not found. Install from https://fly.io/docs/flyctl/install/"
fi

echo
echo "2. Checking authentication..."
echo "-----------------------------"

# Check Fly auth
if fly auth whoami >/dev/null 2>&1; then
    fly_user=$(fly auth whoami 2>/dev/null)
    check_result 0 "Logged into Fly.io as: $fly_user"
else
    check_result 1 "Not logged into Fly.io. Run: fly auth login"
fi

echo
echo "3. Checking configuration files..."
echo "----------------------------------"

# Check fly.toml files
if [ -f "fly-client.toml" ]; then
    check_result 0 "fly-client.toml exists"
else
    check_result 1 "fly-client.toml missing"
fi

if [ -f "fly-server.toml" ]; then
    check_result 0 "fly-server.toml exists"
else
    check_result 1 "fly-server.toml missing"
fi

# Check main.wasp
if [ -f "main.wasp" ]; then
    check_result 0 "main.wasp exists"
else
    check_result 1 "main.wasp missing"
fi

# Check package.json
if [ -f "package.json" ]; then
    check_result 0 "package.json exists"
else
    check_result 1 "package.json missing"
fi

echo
echo "4. Checking environment files..."
echo "--------------------------------"

# Check .env files
if [ -f ".env.server" ]; then
    check_result 0 ".env.server exists"
    
    # Check for required server env vars
    required_server_vars=("STRIPE_API_KEY" "SENDGRID_API_KEY" "ADMIN_EMAILS")
    for var in "${required_server_vars[@]}"; do
        if grep -q "^$var=" .env.server 2>/dev/null; then
            if grep -q "^$var=.*\.\.\." .env.server 2>/dev/null; then
                check_result 1 ".env.server: $var has placeholder value"
            else
                check_result 0 ".env.server: $var is set"
            fi
        else
            check_result 1 ".env.server: $var is missing"
        fi
    done
else
    check_result 1 ".env.server missing (copy from .env.server.example)"
fi

if [ -f ".env.client" ]; then
    check_result 0 ".env.client exists"
else
    echo -e "${YELLOW}⚠${NC} .env.client missing (optional, copy from .env.client.example if needed)"
fi

echo
echo "5. Checking database configuration..."
echo "------------------------------------"

# Check if using Wasp DB or external
if grep -q "^DATABASE_URL=" .env.server 2>/dev/null; then
    check_result 0 "External database configured"
else
    echo -e "${YELLOW}⚠${NC} Using Wasp managed database (will be created during deployment)"
fi

echo
echo "6. Production readiness checks..."
echo "--------------------------------"

# Check for test/development values that shouldn't be in production
if grep -q "sk_test_" .env.server 2>/dev/null; then
    check_result 1 "Found Stripe test key - replace with production key"
else
    check_result 0 "No Stripe test keys found"
fi

if grep -q "@example.com" .env.server 2>/dev/null; then
    check_result 1 "Found example email addresses - replace with real addresses"
else
    check_result 0 "No example email addresses found"
fi

echo
echo "7. Security checks..."
echo "--------------------"

# Check that sensitive files are in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore 2>/dev/null; then
        check_result 0 ".env files are in .gitignore"
    else
        check_result 1 ".env files should be added to .gitignore"
    fi
else
    check_result 1 ".gitignore file missing"
fi

echo
echo "================================================="
echo "Summary:"
echo "✅ Passed: $check_passed"
echo "❌ Failed: $check_failed"

if [ $check_failed -eq 0 ]; then
    echo
    echo -e "${GREEN}🎉 All checks passed! Your app is ready for deployment.${NC}"
    echo
    echo "To deploy, run:"
    echo "  REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id wasp deploy"
    echo
    echo "Or if you don't have Google Analytics:"
    echo "  wasp deploy"
else
    echo
    echo -e "${RED}❌ $check_failed checks failed. Please fix the issues above before deploying.${NC}"
    exit 1
fi
