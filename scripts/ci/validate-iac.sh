#!/usr/bin/env bash
set -euo pipefail

# Resolve script directory to allow running from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "--- validating IaC syntax"
if command -v terraform &> /dev/null; then
    if [ -d "terraform" ]; then
        echo "Running terraform fmt check..."
        terraform fmt -check -recursive terraform/

        echo "Running terraform validate..."
        # We need to init to validate. using backend=false to avoid state locking/config
        # Using -input=false to avoid waiting for user input
        pushd terraform > /dev/null
        terraform init -backend=false -input=false
        terraform validate
        popd > /dev/null
    else
        echo "terraform/ directory not found, skipping TF checks."
    fi
else
    echo "terraform command not found. Skipping terraform syntax validation."
    echo "Ensure terraform is installed in the CI environment or install it locally."
fi

echo "--- IaC schema validation"
if [ -f "scripts/iac/validate-schema.cjs" ]; then
    node scripts/iac/validate-schema.cjs
elif [ -f "scripts/iac/validate-schema.js" ]; then
    node scripts/iac/validate-schema.js
else
    echo "scripts/iac/validate-schema.cjs not found."
fi

echo "--- finished IaC validation"
