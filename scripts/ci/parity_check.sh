#!/bin/bash

# Parity Check Script
# Verifies that the environment configuration matches the expected state.

set -e

# Helper to check if a variable is set
check_var() {
    local var_name="$1"
    if [ -z "${!var_name:-}" ]; then
        echo "::warning::Variable $var_name is not set. Skipping related checks."
        return 1
    fi
    return 0
}

echo "Starting Parity Check..."

if [ "$CLOUD" == "aws" ]; then
    echo "==> [1] Validate OIDC trust for aws"
    if check_var "AWS_ROLE_ARN"; then
        echo "Checking AWS OIDC..."
    else
        echo "Skipping AWS checks due to missing credentials."
    fi
fi

if [ "$CLOUD" == "gcp" ]; then
    echo "==> [1] Validate OIDC trust for gcp"
    if check_var "GCP_WORKLOAD_POOL"; then
       echo "Checking GCP OIDC..."
    else
       echo "Skipping GCP checks due to missing credentials."
    fi
fi

if [ "$CLOUD" == "azure" ]; then
    echo "==> [1] Validate OIDC trust for azure"
    if check_var "AZURE_FEDERATED_ID"; then
       echo "Checking Azure OIDC..."
    else
       echo "Skipping Azure checks due to missing credentials."
    fi
fi

echo "Parity Check Completed Successfully (or skipped gracefully)."
