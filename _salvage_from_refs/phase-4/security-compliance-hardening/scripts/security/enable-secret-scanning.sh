#!/bin/bash

# Script to enable GitHub secret scanning and push protection
# Phase 4: Security & Compliance requirement

set -euo pipefail

REPO="BrianCLong/summit"

echo "🔒 Enabling GitHub Secret Scanning and Push Protection for $REPO"

# Enable secret scanning
echo "📡 Enabling secret scanning..."
gh api --method PATCH "/repos/$REPO" \
  --field security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}' \
  --header "Accept: application/vnd.github+json" || {
    echo "⚠️  Secret scanning might already be enabled or require admin permissions"
  }

# Check current status
echo "📊 Current security settings:"
gh api "/repos/$REPO" \
  --jq '.security_and_analysis // "Security settings not available (may require admin permissions)"'

# Enable Dependabot alerts if not already enabled
echo "🤖 Enabling Dependabot alerts..."
gh api --method PUT "/repos/$REPO/vulnerability-alerts" \
  --header "Accept: application/vnd.github+json" || {
    echo "⚠️  Dependabot alerts might already be enabled"
  }

# Enable Dependabot security updates
echo "🔧 Enabling Dependabot security updates..."
gh api --method PUT "/repos/$REPO/automated-security-fixes" \
  --header "Accept: application/vnd.github+json" || {
    echo "⚠️  Dependabot security updates might already be enabled"
  }

echo "✅ Security scanning configuration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review any existing secret scanning alerts in the repository"
echo "2. Update any exposed secrets found during historical scanning"
echo "3. Document remediation steps in SECURITY/secret-remediation.md"
echo "4. Train team on secret hygiene best practices"