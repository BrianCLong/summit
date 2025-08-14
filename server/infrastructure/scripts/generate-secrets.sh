#!/bin/bash

# IntelGraph Production Secrets Generator
# Generates secure random secrets for production deployment

set -e

echo "🔐 Generating secure secrets for IntelGraph production deployment..."

# Function to generate secure random string
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate UUID
generate_uuid() {
    if command -v uuidgen >/dev/null 2>&1; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        python3 -c "import uuid; print(str(uuid.uuid4()))"
    fi
}

# Create secrets file
SECRETS_FILE=".env.secrets"

echo "# Generated secrets for IntelGraph production deployment" > $SECRETS_FILE
echo "# Generated on: $(date)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Database passwords
echo "# Database Passwords" >> $SECRETS_FILE
echo "NEO4J_PASSWORD=$(generate_secret 32)" >> $SECRETS_FILE
echo "POSTGRES_PASSWORD=$(generate_secret 32)" >> $SECRETS_FILE
echo "REDIS_PASSWORD=$(generate_secret 32)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# JWT Secrets
echo "# JWT Secrets" >> $SECRETS_FILE
echo "JWT_SECRET=$(generate_secret 64)" >> $SECRETS_FILE
echo "JWT_REFRESH_SECRET=$(generate_secret 64)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Application Secrets
echo "# Application Secrets" >> $SECRETS_FILE
echo "SESSION_SECRET=$(generate_secret 64)" >> $SECRETS_FILE
echo "ENCRYPTION_KEY=$(generate_secret 32)" >> $SECRETS_FILE
echo "API_KEY_SALT=$(generate_secret 32)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Service UUIDs
echo "# Service Identifiers" >> $SECRETS_FILE
echo "SERVICE_ID=$(generate_uuid)" >> $SECRETS_FILE
echo "DEPLOYMENT_ID=$(generate_uuid)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Webhook Secrets
echo "# Webhook Secrets" >> $SECRETS_FILE
echo "GITHUB_WEBHOOK_SECRET=$(generate_secret 32)" >> $SECRETS_FILE
echo "SLACK_WEBHOOK_SECRET=$(generate_secret 32)" >> $SECRETS_FILE
echo "BACKUP_WEBHOOK_SECRET=$(generate_secret 32)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

# Monitoring Access
echo "# Monitoring Access" >> $SECRETS_FILE
echo "MONITORING_PASSWORD=$(generate_secret 24)" >> $SECRETS_FILE
echo "REPORTING_PASSWORD=$(generate_secret 24)" >> $SECRETS_FILE
echo "GRAFANA_ADMIN_PASSWORD=$(generate_secret 24)" >> $SECRETS_FILE
echo "" >> $SECRETS_FILE

echo "✅ Secrets generated and saved to $SECRETS_FILE"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   1. Store these secrets securely (use a password manager or secrets vault)"
echo "   2. Never commit this file to version control"
echo "   3. Set appropriate file permissions: chmod 600 $SECRETS_FILE"
echo "   4. Copy the secrets to your production environment variables"
echo "   5. Delete this file after copying the secrets"
echo ""
echo "🔧 Next steps:"
echo "   1. Copy secrets to your .env file or deployment configuration"
echo "   2. Update your container orchestration secrets (Kubernetes, Docker Swarm, etc.)"
echo "   3. Configure your CI/CD pipeline with these secrets"
echo ""

# Set secure permissions
chmod 600 $SECRETS_FILE

# Generate Docker secrets for Docker Swarm
echo "📋 Docker Swarm secrets commands:"
echo ""
cat $SECRETS_FILE | grep -v "^#" | grep -v "^$" | while IFS='=' read -r key value; do
    echo "echo '$value' | docker secret create intelgraph_${key,,} -"
done
echo ""

# Generate Kubernetes secrets YAML
echo "🚢 Generating Kubernetes secrets YAML..."
K8S_SECRETS_FILE="kubernetes-secrets.yaml"

cat > $K8S_SECRETS_FILE << EOF
apiVersion: v1
kind: Secret
metadata:
  name: intelgraph-secrets
  namespace: intelgraph
type: Opaque
data:
EOF

cat $SECRETS_FILE | grep -v "^#" | grep -v "^$" | while IFS='=' read -r key value; do
    encoded_value=$(echo -n "$value" | base64 -w 0)
    echo "  ${key,,}: $encoded_value" >> $K8S_SECRETS_FILE
done

echo ""
echo "✅ Kubernetes secrets saved to $K8S_SECRETS_FILE"
echo "   Apply with: kubectl apply -f $K8S_SECRETS_FILE"