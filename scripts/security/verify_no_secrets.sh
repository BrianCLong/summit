#!/bin/bash
set -e

# Verify no secrets in git history
echo "Starting Secret Scan..."

if ! command -v gitleaks &> /dev/null; then
    echo "gitleaks not found. Please install it (e.g., brew install gitleaks)."
    exit 1
fi

# Run gitleaks with the project config
gitleaks detect --source . --config .gitleaks.toml --verbose --redact

echo "Secret scan complete. No secrets found."
