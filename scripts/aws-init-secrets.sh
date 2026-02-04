#!/usr/bin/env bash
set -euo pipefail

# Summit Platform - AWS Secrets Bootstrap
# Usage: ./scripts/aws-init-secrets.sh
# Pre-req: kubectl pointing to the correct EKS cluster

echo "🔐 Bootstrapping Secrets for Summit Platform..."

# 1. Database Credentials
if kubectl get secret db-credentials >/dev/null 2>&1; then
  echo "✅ 'db-credentials' already exists."
else
  echo "Enter Aurora Master Password:"
  read -s DB_PASSWORD
  
  # Connection string format for Prisma/Node
  # postgresql://USER:PASSWORD@HOST:5432/DBNAME
  # We assume the host is output from Terraform, but for now we'll ask or use a placeholder
  echo "Enter Aurora Host (from terraform output):"
  read DB_HOST

  CONN_STR="postgresql://summit_admin:${DB_PASSWORD}@${DB_HOST}:5432/summit_prod?schema=public&connection_limit=5"

  kubectl create secret generic db-credentials \
    --from-literal=password="${DB_PASSWORD}" \
    --from-literal=connection_string="${CONN_STR}"
  
  echo "✅ Created 'db-credentials'"
fi

# 2. API Keys (OpenAI, Anthropic, etc.)
if kubectl get secret api-keys >/dev/null 2>&1; then
  echo "✅ 'api-keys' already exists."
else
  echo "Enter OpenAI API Key:"
  read -s OPENAI_KEY
  
  kubectl create secret generic api-keys \
    --from-literal=OPENAI_API_KEY="${OPENAI_KEY}"
  
  echo "✅ Created 'api-keys'"
fi

echo "🎉 Secrets bootstrap complete! You can now deploy applications."

