#!/bin/bash

# Generate Secure Secrets for IntelGraph Docker Deployment
# Creates strong passwords and keys for production use

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="${PROJECT_ROOT}/secrets"
BACKUP_DIR="${PROJECT_ROOT}/secrets/backup"

# Print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Generate random password
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Generate random hex string
generate_hex() {
    local length="${1:-64}"
    openssl rand -hex "$((length / 2))"
}

# Create secrets directory
create_secrets_dir() {
    print_status "$BLUE" "🔐 Setting up secrets directory..."
    
    # Create directories
    mkdir -p "$SECRETS_DIR" "$BACKUP_DIR"
    
    # Set secure permissions
    chmod 700 "$SECRETS_DIR" "$BACKUP_DIR"
    
    print_status "$GREEN" "✅ Secrets directory created at: $SECRETS_DIR"
}

# Backup existing secrets
backup_existing_secrets() {
    if [ -d "$SECRETS_DIR" ] && [ "$(ls -A "$SECRETS_DIR" 2>/dev/null | grep -v backup | head -1)" ]; then
        local timestamp
        timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_path="$BACKUP_DIR/secrets_backup_$timestamp"
        
        print_status "$YELLOW" "⚠️  Existing secrets found. Creating backup..."
        
        mkdir -p "$backup_path"
        cp "$SECRETS_DIR"/*.txt "$backup_path"/ 2>/dev/null || true
        
        print_status "$GREEN" "✅ Backup created at: $backup_path"
    fi
}

# Generate database passwords
generate_database_secrets() {
    print_status "$BLUE" "🗄️ Generating database secrets..."
    
    # Neo4j password
    local neo4j_password
    neo4j_password=$(generate_password 24)
    echo "$neo4j_password" > "$SECRETS_DIR/neo4j_password.txt"
    chmod 600 "$SECRETS_DIR/neo4j_password.txt"
    print_status "$GREEN" "✅ Neo4j password generated"
    
    # PostgreSQL password
    local postgres_password
    postgres_password=$(generate_password 24)
    echo "$postgres_password" > "$SECRETS_DIR/postgres_password.txt"
    chmod 600 "$SECRETS_DIR/postgres_password.txt"
    print_status "$GREEN" "✅ PostgreSQL password generated"
    
    # Redis password
    local redis_password
    redis_password=$(generate_password 24)
    echo "$redis_password" > "$SECRETS_DIR/redis_password.txt"
    chmod 600 "$SECRETS_DIR/redis_password.txt"
    print_status "$GREEN" "✅ Redis password generated"
}

# Generate application secrets
generate_app_secrets() {
    print_status "$BLUE" "🚀 Generating application secrets..."
    
    # JWT Secret
    local jwt_secret
    jwt_secret=$(generate_hex 64)
    echo "$jwt_secret" > "$SECRETS_DIR/jwt_secret.txt"
    chmod 600 "$SECRETS_DIR/jwt_secret.txt"
    print_status "$GREEN" "✅ JWT secret generated"
    
    # Session Secret
    local session_secret
    session_secret=$(generate_hex 64)
    echo "$session_secret" > "$SECRETS_DIR/session_secret.txt"
    chmod 600 "$SECRETS_DIR/session_secret.txt"
    print_status "$GREEN" "✅ Session secret generated"
    
    # Encryption Key
    local encryption_key
    encryption_key=$(generate_hex 32)
    echo "$encryption_key" > "$SECRETS_DIR/encryption_key.txt"
    chmod 600 "$SECRETS_DIR/encryption_key.txt"
    print_status "$GREEN" "✅ Encryption key generated"
    
    # API Key
    local api_key
    api_key=$(generate_password 40)
    echo "$api_key" > "$SECRETS_DIR/api_key.txt"
    chmod 600 "$SECRETS_DIR/api_key.txt"
    print_status "$GREEN" "✅ API key generated"
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certificates() {
    print_status "$BLUE" "🔒 Generating SSL certificates..."
    
    local ssl_dir="$SECRETS_DIR/ssl"
    mkdir -p "$ssl_dir"
    chmod 700 "$ssl_dir"
    
    # Generate private key
    openssl genrsa -out "$ssl_dir/key.pem" 2048
    chmod 600 "$ssl_dir/key.pem"
    
    # Generate certificate signing request
    openssl req -new -key "$ssl_dir/key.pem" -out "$ssl_dir/csr.pem" -subj "/C=US/ST=CA/L=San Francisco/O=IntelGraph/CN=localhost"
    
    # Generate self-signed certificate
    openssl x509 -req -in "$ssl_dir/csr.pem" -signkey "$ssl_dir/key.pem" -out "$ssl_dir/cert.pem" -days 365
    chmod 600 "$ssl_dir/cert.pem"
    
    # Clean up CSR
    rm "$ssl_dir/csr.pem"
    
    print_status "$GREEN" "✅ SSL certificates generated (valid for 365 days)"
    print_status "$YELLOW" "⚠️  Note: These are self-signed certificates for development only"
}

# Create environment file template
create_env_template() {
    print_status "$BLUE" "📝 Creating environment file template..."
    
    local env_file="$PROJECT_ROOT/.env.secure"
    
    cat > "$env_file" << EOF
# IntelGraph Security-Hardened Environment Configuration
# Generated on: $(date)
# 
# SECURITY WARNING: This file contains sensitive information.
# - Never commit this file to version control
# - Ensure proper file permissions (600)
# - Use secrets management in production

# Application Configuration
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
TZ=UTC

# Database Configuration (using Docker secrets)
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD is loaded from /run/secrets/neo4j_password

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=intelgraph_prod
POSTGRES_USER=intelgraph
# POSTGRES_PASSWORD is loaded from /run/secrets/postgres_password

REDIS_HOST=redis
REDIS_PORT=6379
# REDIS_PASSWORD is loaded from /run/secrets/redis_password

# Security Configuration
JWT_SECRET_FILE=/run/secrets/jwt_secret
SESSION_SECRET_FILE=/run/secrets/session_secret
ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
API_KEY_FILE=/run/secrets/api_key

# Security Headers and Policies
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGIN=https://localhost,https://intelgraph.local
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/TLS Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/run/secrets/ssl/cert.pem
SSL_KEY_PATH=/run/secrets/ssl/key.pem

# Monitoring and Logging
ENABLE_PROMETHEUS_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_AUDIT_LOGGING=true
LOG_SECURITY_EVENTS=true

# Feature Flags
ENABLE_GRAPHQL_PLAYGROUND=false
ENABLE_INTROSPECTION=false
ENABLE_SUBSCRIPTIONS=true

# External Services
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_SECURE=true
# SMTP_USER=
# SMTP_PASSWORD=

# Backup and Maintenance
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
MAINTENANCE_MODE=false
EOF
    
    chmod 600 "$env_file"
    print_status "$GREEN" "✅ Environment template created: .env.secure"
}

# Create secrets inventory
create_secrets_inventory() {
    print_status "$BLUE" "📋 Creating secrets inventory..."
    
    local inventory_file="$SECRETS_DIR/secrets_inventory.md"
    
    cat > "$inventory_file" << EOF
# IntelGraph Secrets Inventory

Generated on: $(date)

## Database Secrets

| Secret | File | Usage | Rotation Schedule |
|--------|------|-------|------------------|
| Neo4j Password | \`neo4j_password.txt\` | Neo4j database authentication | Every 90 days |
| PostgreSQL Password | \`postgres_password.txt\` | PostgreSQL database authentication | Every 90 days |
| Redis Password | \`redis_password.txt\` | Redis cache authentication | Every 90 days |

## Application Secrets

| Secret | File | Usage | Rotation Schedule |
|--------|------|-------|------------------|
| JWT Secret | \`jwt_secret.txt\` | JWT token signing and verification | Every 30 days |
| Session Secret | \`session_secret.txt\` | Session cookie signing | Every 30 days |
| Encryption Key | \`encryption_key.txt\` | Application data encryption | Every 180 days |
| API Key | \`api_key.txt\` | External API authentication | Every 90 days |

## SSL Certificates

| Certificate | File | Usage | Expiry |
|------------|------|-------|---------|
| SSL Certificate | \`ssl/cert.pem\` | HTTPS/TLS encryption | $(date -d '+365 days' '+%Y-%m-%d') |
| SSL Private Key | \`ssl/key.pem\` | HTTPS/TLS encryption | $(date -d '+365 days' '+%Y-%m-%d') |

## Security Notes

1. **File Permissions**: All secret files have 600 permissions (owner read/write only)
2. **Directory Permissions**: Secrets directory has 700 permissions (owner access only)
3. **Backup Policy**: Secrets are backed up before regeneration with timestamp
4. **Rotation Policy**: Follow the rotation schedule above for security best practices
5. **Production Usage**: Use external secrets management (AWS Secrets Manager, HashiCorp Vault, etc.) in production

## Commands

### Regenerate All Secrets
\`\`\`bash
./scripts/generate-secrets.sh --regenerate
\`\`\`

### Rotate Specific Secret
\`\`\`bash
./scripts/generate-secrets.sh --rotate jwt
\`\`\`

### Backup Current Secrets
\`\`\`bash
./scripts/generate-secrets.sh --backup
\`\`\`

## Security Checklist

- [ ] Secrets are not committed to version control
- [ ] Proper file permissions are set (600 for files, 700 for directory)
- [ ] Secrets are rotated according to schedule
- [ ] Backups are stored securely
- [ ] Production uses external secrets management
- [ ] Access to secrets is logged and monitored
EOF
    
    chmod 600 "$inventory_file"
    print_status "$GREEN" "✅ Secrets inventory created: secrets_inventory.md"
}

# Verify secrets generation
verify_secrets() {
    print_status "$BLUE" "🔍 Verifying generated secrets..."
    
    local secrets_count=0
    local failed_count=0
    
    # Check each secret file
    local secret_files=(
        "neo4j_password.txt"
        "postgres_password.txt" 
        "redis_password.txt"
        "jwt_secret.txt"
        "session_secret.txt"
        "encryption_key.txt"
        "api_key.txt"
        "ssl/cert.pem"
        "ssl/key.pem"
    )
    
    for secret_file in "${secret_files[@]}"; do
        local file_path="$SECRETS_DIR/$secret_file"
        secrets_count=$((secrets_count + 1))
        
        if [ -f "$file_path" ]; then
            local file_size
            file_size=$(stat -c%s "$file_path" 2>/dev/null || stat -f%z "$file_path" 2>/dev/null)
            
            if [ "$file_size" -gt 0 ]; then
                print_status "$GREEN" "  ✅ $secret_file ($file_size bytes)"
            else
                print_status "$RED" "  ❌ $secret_file (empty file)"
                failed_count=$((failed_count + 1))
            fi
        else
            print_status "$RED" "  ❌ $secret_file (missing)"
            failed_count=$((failed_count + 1))
        fi
    done
    
    if [ $failed_count -eq 0 ]; then
        print_status "$GREEN" "✅ All $secrets_count secrets generated successfully"
        return 0
    else
        print_status "$RED" "❌ $failed_count out of $secrets_count secrets failed"
        return 1
    fi
}

# Display usage information
show_usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Generate secure secrets for IntelGraph Docker deployment.

OPTIONS:
    --help              Show this help message
    --regenerate        Regenerate all secrets (backup existing first)
    --rotate <secret>   Rotate specific secret (jwt, session, encryption, api, db, ssl)
    --backup           Create backup of current secrets
    --verify           Verify existing secrets
    --force            Skip confirmation prompts

EXAMPLES:
    $(basename "$0")                    # Generate all secrets
    $(basename "$0") --regenerate       # Regenerate all secrets with backup
    $(basename "$0") --rotate jwt       # Rotate only JWT secret
    $(basename "$0") --backup          # Backup current secrets
    $(basename "$0") --verify          # Verify existing secrets

SECURITY NOTES:
    - All secrets use cryptographically secure random generation
    - File permissions are set to 600 (owner read/write only)
    - Directory permissions are set to 700 (owner access only)
    - Existing secrets are automatically backed up before regeneration
    - SSL certificates are self-signed for development use only

EOF
}

# Main execution
main() {
    local action="${1:-generate}"
    local force=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_usage
                exit 0
                ;;
            --regenerate)
                action="regenerate"
                shift
                ;;
            --rotate)
                action="rotate"
                rotate_secret="$2"
                shift 2
                ;;
            --backup)
                action="backup"
                shift
                ;;
            --verify)
                action="verify"
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    case "$action" in
        "generate"|"regenerate")
            print_status "$BLUE" "🔐 Generating IntelGraph Secrets..."
            
            if [ "$action" = "regenerate" ] && [ "$force" = false ]; then
                print_status "$YELLOW" "⚠️  This will regenerate ALL secrets. Continue? (y/N)"
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    print_status "$BLUE" "Operation cancelled."
                    exit 0
                fi
            fi
            
            create_secrets_dir
            backup_existing_secrets
            generate_database_secrets
            generate_app_secrets
            generate_ssl_certificates
            create_env_template
            create_secrets_inventory
            
            if verify_secrets; then
                print_status "$GREEN" "🎉 All secrets generated successfully!"
                print_status "$BLUE" "📋 Next steps:"
                print_status "$BLUE" "   1. Review the generated .env.secure file"
                print_status "$BLUE" "   2. Update docker-compose.secure.yml with secret references"
                print_status "$BLUE" "   3. Set proper file permissions on the secrets directory"
                print_status "$BLUE" "   4. Consider using external secrets management in production"
            else
                print_status "$RED" "❌ Secret generation failed!"
                exit 1
            fi
            ;;
        "verify")
            if verify_secrets; then
                print_status "$GREEN" "✅ All secrets verified successfully"
            else
                print_status "$RED" "❌ Secret verification failed"
                exit 1
            fi
            ;;
        "backup")
            backup_existing_secrets
            print_status "$GREEN" "✅ Secrets backup completed"
            ;;
        *)
            print_status "$RED" "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Run the script
main "$@"