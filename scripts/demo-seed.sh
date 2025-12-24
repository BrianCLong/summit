#!/bin/bash

# Demo Data Seeder for Summit Platform
# Safely seeds demo data with proper safety checks
#
# Usage:
#   DEMO_MODE=1 ./scripts/demo-seed.sh
#
# Constraints:
# - Refuses to run if NODE_ENV=production
# - Only runs when DEMO_MODE=1 is set

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Print error message and exit
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Print info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Print success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if running in demo mode
check_demo_mode() {
    if [[ -z "${DEMO_MODE:-}" ]]; then
        error_exit "DEMO_MODE environment variable must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-seed.sh"
    fi

    if [[ "$DEMO_MODE" != "1" ]]; then
        error_exit "DEMO_MODE must be set to 1 to run this script.
        
This is a safety measure to prevent accidental execution in production.
To run: DEMO_MODE=1 ./scripts/demo-seed.sh"
    fi

    if [[ "${NODE_ENV:-}" == "production" ]]; then
        error_exit "NODE_ENV is set to 'production'. This script cannot run in production environment.
        
This is a safety measure to prevent accidental execution in production.
To run: NODE_ENV=development DEMO_MODE=1 ./scripts/demo-seed.sh"
    fi

    success_msg "Demo mode enabled and safety checks passed"
}

# Seed demo data
seed_demo_data() {
    info_msg "Seeding demo data..."

    # Check if demo seed script exists
    if [[ ! -f "$PROJECT_ROOT/server/scripts/seed-demo.ts" ]]; then
        error_exit "Demo seed script not found: $PROJECT_ROOT/server/scripts/seed-demo.ts"
    fi

    # Run the demo seed script
    if ! cd "$PROJECT_ROOT/server" && npx tsx scripts/seed-demo.ts; then
        error_exit "Failed to seed demo data"
    fi

    success_msg "Demo data seeded successfully"
}

# Main execution function
main() {
    echo -e "${BLUE}🌱 Summit Platform Demo Data Seeder${NC}"
    echo -e "${BLUE}==================================${NC}"
    echo ""

    # Check demo mode
    check_demo_mode

    # Seed demo data
    seed_demo_data

    echo ""
    success_msg "Demo seeding completed successfully!"
}

# Run main function
main