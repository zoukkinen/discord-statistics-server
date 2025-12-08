#!/usr/bin/env bash

# Comprehensive test runner for Discord Statistics Server
# This script runs all tests in the correct order and provides detailed reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERBOSE=${VERBOSE:-false}
COVERAGE=${COVERAGE:-false}
CI=${CI:-false}

echo -e "${BLUE}🧪 Discord Statistics Server - Comprehensive Test Suite${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

# Check if required dependencies are installed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if ! npm list jest >/dev/null 2>&1; then
    echo -e "${RED}❌ Jest not found. Installing test dependencies...${NC}"
    npm install
fi

if ! npm list vitest >/dev/null 2>&1; then
    echo -e "${RED}❌ Vitest not found. Installing test dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

# Set test environment
export NODE_ENV=test
export VERBOSE_TESTS=${VERBOSE}

# Function to run a test suite and track results
run_test_suite() {
    local name="$1"
    local command="$2"
    local description="$3"
    
    echo -e "${BLUE}🔍 Running ${name}...${NC}"
    echo -e "${YELLOW}   ${description}${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${name} failed${NC}"
        return 1
    fi
}

# Initialize test results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_TESTS=()

# Test Suite 1: Unit Tests
TOTAL_SUITES=$((TOTAL_SUITES + 1))
echo -e "${BLUE}=================== UNIT TESTS ===================${NC}"
if run_test_suite "Unit Tests" "npm run test:unit" "Testing core business logic and utilities"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_TESTS+=("Unit Tests")
fi
echo ""

# Test Suite 2: Migration Tests
TOTAL_SUITES=$((TOTAL_SUITES + 1))
echo -e "${BLUE}================== MIGRATION TESTS ================${NC}"
if run_test_suite "Migration Tests" "npm run test:migration" "Testing database migrations and Discord credentials integration"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_TESTS+=("Migration Tests")
fi
echo ""

# Test Suite 3: Integration Tests
TOTAL_SUITES=$((TOTAL_SUITES + 1))
echo -e "${BLUE}================= INTEGRATION TESTS ===============${NC}"
if run_test_suite "Integration Tests" "npm run test:integration" "Testing database operations and API endpoints"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_TESTS+=("Integration Tests")
fi
echo ""

# Test Suite 4: Frontend Tests
TOTAL_SUITES=$((TOTAL_SUITES + 1))
echo -e "${BLUE}================== FRONTEND TESTS =================${NC}"
if run_test_suite "Frontend Tests" "npm run test:frontend" "Testing SolidJS components and stores"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_TESTS+=("Frontend Tests")
fi
echo ""

# Test Suite 5: Coverage Report (if requested)
if [ "$COVERAGE" = "true" ]; then
    echo -e "${BLUE}================== COVERAGE REPORT ================${NC}"
    echo -e "${YELLOW}📊 Generating coverage report...${NC}"
    
    # Generate backend coverage
    npm run test:coverage --silent
    
    # Generate frontend coverage  
    npm run test:frontend -- --coverage --reporter=verbose
    
    echo -e "${GREEN}✅ Coverage reports generated${NC}"
    echo -e "${YELLOW}   Backend coverage: coverage/lcov-report/index.html${NC}"
    echo -e "${YELLOW}   Frontend coverage: coverage/index.html${NC}"
    echo ""
fi

# Summary
echo -e "${BLUE}====================== SUMMARY =====================${NC}"
echo -e "Test Suites: ${PASSED_SUITES}/${TOTAL_SUITES} passed"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All test suites passed successfully!${NC}"
    echo ""
    echo -e "${GREEN}✅ The discord-settings-to-admin-panel branch is ready for deployment${NC}"
    echo -e "   - Database migrations work correctly"
    echo -e "   - Discord credentials encryption is functioning"
    echo -e "   - Admin panel integration is working"
    echo -e "   - API endpoints are responding properly"
    echo -e "   - Frontend components are rendering correctly"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Failed test suites:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}   - $test${NC}"
    done
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting tips:${NC}"
    echo -e "   1. Check if PostgreSQL is running and accessible"
    echo -e "   2. Verify .env.test file has correct database credentials"
    echo -e "   3. Ensure test database exists and migrations can run"
    echo -e "   4. Check for any missing dependencies: npm install"
    echo -e "   5. Run tests with VERBOSE_TESTS=true for detailed output"
    echo ""
    exit 1
fi