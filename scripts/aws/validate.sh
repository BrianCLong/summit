#!/bin/bash
set -e

# AWS Path A Validation Script

TF_DIR="infra/aws/terraform"

echo "Checking Terraform configuration in $TF_DIR..."

if [ ! -d "$TF_DIR" ]; then
    echo "Error: Directory $TF_DIR does not exist."
    false # This will exit because of set -e
fi

cd "$TF_DIR"

echo "1. Formatting Check (terraform fmt)..."
terraform fmt -check -recursive
echo "   [OK] Formatting is correct."

echo "2. Initialization (backend=false)..."
terraform init -backend=false > /dev/null
echo "   [OK] Initialization successful."

echo "3. Validation (terraform validate)..."
terraform validate
echo "   [OK] Configuration is valid."

echo "----------------------------------------"
echo "✅ AWS Path A foundation validation passed."
