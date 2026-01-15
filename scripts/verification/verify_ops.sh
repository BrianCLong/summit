#!/usr/bin/env bash

# Unified Ops Verify Gate
# Runs deterministic validators for Observability and Storage/DR.

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TARGET=${VERIFY_OPS_TARGET:-all}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

run_validator() {
    local name=$1
    local script=$2

    log_header "Running $name Validator"
    if [ -f "$script" ]; then
        if [[ "$script" == *.ts ]]; then
            npx tsx "$script"
        elif [[ "$script" == *.sh ]]; then
            bash "$script"
        else
            "$script"
        fi

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $name Passed${NC}"
        else
            echo -e "${RED}✗ $name Failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Validator script not found: $script${NC}"
        exit 1
    fi
}

echo "Starting Ops Verification (Target: $TARGET)..."

# Observability Validators
if [[ "$TARGET" == "all" || "$TARGET" == "observability" ]]; then
    run_validator "Prometheus Rules" "scripts/verification/verify_prometheus_rules.ts"
    run_validator "Grafana Dashboards" "scripts/verification/verify_grafana_dashboards.ts"
fi

# Storage/DR Validators
if [[ "$TARGET" == "all" || "$TARGET" == "storage" || "$TARGET" == "dr" ]]; then
    run_validator "Storage & DR" "scripts/verification/verify_storage_dr.ts"
fi

echo -e "\n${GREEN}All Ops Verification Checks Passed!${NC}"
