#!/bin/bash

# Summit Release Captain - Environment Setup
# Creates GitHub environments with protection rules and required secrets

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-BrianCLong/summit}"

echo "🌍 Setting up GitHub environments for $REPO"

# Define environments with their protection rules
declare -A ENVIRONMENTS=(
  ["staging"]="reviewers:1 wait:0 branch:main"
  ["production"]="reviewers:2 wait:300 branch:main"
)

# Required secrets for each environment
REQUIRED_SECRETS=(
  "DEPLOY_TOKEN"
  "KUBE_CONFIG"
  "DATABASE_URL"
  "API_SECRET_KEY"
  "GITLEAKS_LICENSE"
  "WEBHOOK_SECRET"
)

# Required variables for each environment
REQUIRED_VARIABLES=(
  "BASE_URL"
  "API_VERSION"
  "LOG_LEVEL"
  "METRICS_ENABLED"
)

create_environment() {
  local env_name=$1
  local config=$2

  echo "🔧 Creating environment: $env_name"

  # Parse configuration
  local reviewers=$(echo "$config" | cut -d' ' -f1 | cut -d':' -f2)
  local wait_timer=$(echo "$config" | cut -d' ' -f2 | cut -d':' -f2)
  local protected_branch=$(echo "$config" | cut -d' ' -f3 | cut -d':' -f2)

  # Create environment
  gh api -X PUT "/repos/$REPO/environments/$env_name" \
    --silent || echo "Environment $env_name already exists"

  # Set protection rules
  local protection_rules='{
    "wait_timer": '$wait_timer',
    "reviewers": [
      {
        "type": "User",
        "id": 1
      }
    ],
    "deployment_branch_policy": {
      "protected_branches": true,
      "custom_branch_policies": false
    }
  }'

  echo "🛡️ Setting protection rules for $env_name..."
  gh api -X PUT "/repos/$REPO/environments/$env_name" \
    --input <(echo "$protection_rules") \
    --silent || echo "Failed to set protection rules for $env_name"

  echo "✅ Environment $env_name configured"
}

setup_secrets_template() {
  local env_name=$1

  echo "📝 Setting up secrets template for $env_name..."

  cat > "${env_name}-secrets-template.txt" << EOF
# $env_name Environment Secrets
# Copy this template and set actual values

# Deployment secrets
DEPLOY_TOKEN=github_pat_your_token_here
KUBE_CONFIG=base64_encoded_kubeconfig

# Database configuration
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Application secrets
API_SECRET_KEY=your_secret_key_here
WEBHOOK_SECRET=your_webhook_secret

# Security tools
GITLEAKS_LICENSE=your_gitleaks_license_if_required

# To set secrets:
# gh secret set DEPLOY_TOKEN --env $env_name --body "your_token"
# gh secret set DATABASE_URL --env $env_name --body "your_db_url"
# ... etc for each secret
EOF

  echo "📄 Template created: ${env_name}-secrets-template.txt"
}

setup_variables_template() {
  local env_name=$1

  echo "📝 Setting up variables template for $env_name..."

  # Set environment-specific default values
  case "$env_name" in
    "staging")
      base_url="https://staging.summit.dev"
      log_level="debug"
      ;;
    "production")
      base_url="https://summit.dev"
      log_level="info"
      ;;
    *)
      base_url="https://dev.summit.dev"
      log_level="debug"
      ;;
  esac

  cat > "${env_name}-variables-template.txt" << EOF
# $env_name Environment Variables
# Copy this template and set actual values

BASE_URL=$base_url
API_VERSION=v1
LOG_LEVEL=$log_level
METRICS_ENABLED=true

# To set variables:
# gh variable set BASE_URL --env $env_name --body "$base_url"
# gh variable set LOG_LEVEL --env $env_name --body "$log_level"
# ... etc for each variable
EOF

  echo "📄 Template created: ${env_name}-variables-template.txt"
}

verify_environment() {
  local env_name=$1

  echo "🔍 Verifying environment: $env_name"

  # Check if environment exists
  if gh api "/repos/$REPO/environments/$env_name" --silent 2>/dev/null; then
    echo "✅ Environment $env_name exists"

    # List current secrets (names only for security)
    echo "📋 Current secrets:"
    gh api "/repos/$REPO/environments/$env_name/secrets" --jq '.secrets[].name' | \
      while read secret; do echo "  - $secret"; done

    # List current variables
    echo "📋 Current variables:"
    gh api "/repos/$REPO/environments/$env_name/variables" --jq '.variables[] | "  - \(.name): \(.value)"' || \
      echo "  No variables set"
  else
    echo "❌ Environment $env_name does not exist"
  fi
}

# Main execution
echo "🚀 Starting environment setup..."

# Create environments
for env_name in "${!ENVIRONMENTS[@]}"; do
  config="${ENVIRONMENTS[$env_name]}"
  create_environment "$env_name" "$config"
  setup_secrets_template "$env_name"
  setup_variables_template "$env_name"
done

echo ""
echo "📊 Environment Status Summary:"
for env_name in "${!ENVIRONMENTS[@]}"; do
  verify_environment "$env_name"
  echo ""
done

echo "🎯 Next Steps:"
echo "1. Review the generated *-template.txt files"
echo "2. Set actual secret values using 'gh secret set' commands"
echo "3. Set environment variables using 'gh variable set' commands"
echo "4. Test deployments to each environment"
echo ""
echo "📚 Documentation:"
echo "- GitHub Environments: https://docs.github.com/en/actions/deployment/targeting-different-environments"
echo "- Secrets Management: https://docs.github.com/en/actions/security-guides/encrypted-secrets"

echo ""
echo "✅ Environment setup completed!"