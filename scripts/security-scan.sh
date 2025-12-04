#!/bin/bash
set -e

echo "Starting Security Scans..."

# 1. Dependency Audit (npm/pnpm)
echo "Running Dependency Audit..."
if command -v pnpm &> /dev/null; then
    pnpm audit --prod
elif command -v npm &> /dev/null; then
    npm audit --production
else
    echo "No package manager found for audit."
fi

# 2. Trivy Scan (Container Security)
# Assuming Trivy is installed or running in CI
if command -v trivy &> /dev/null; then
    echo "Running Trivy File Scan..."
    trivy fs . --severity HIGH,CRITICAL --ignore-unfixed
else
    echo "Trivy not found. Skipping container scan."
    echo "Install Trivy: https://aquasecurity.github.io/trivy/"
fi

# 3. Gitleaks (Secret Detection)
if command -v gitleaks &> /dev/null; then
    echo "Running Gitleaks..."
    gitleaks detect --source . --verbose
else
    echo "Gitleaks not found. Skipping secret detection."
fi

# 4. OWASP ZAP (DAST) - Placeholder for CI integration
# This usually runs against a live target (e.g., localhost:4000)
# echo "Running OWASP ZAP Baseline Scan..."
# docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:4000

echo "Security Scans Completed."
