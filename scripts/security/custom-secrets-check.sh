#!/bin/bash
# Custom secrets detection script for IntelGraph
# Detects IntelGraph-specific secrets and sensitive data patterns

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Initialize counters
VIOLATIONS=0
WARNINGS=0

# Function to log violations
log_violation() {
    local file="$1"
    local line_num="$2"
    local pattern="$3"
    local severity="$4"
    local content="$5"
    
    if [ "$severity" = "ERROR" ]; then
        echo -e "${RED}[ERROR]${NC} $file:$line_num - $pattern"
        echo -e "  ${RED}Content: $content${NC}"
        ((VIOLATIONS++))
    else
        echo -e "${YELLOW}[WARNING]${NC} $file:$line_num - $pattern"
        echo -e "  ${YELLOW}Content: $content${NC}"
        ((WARNINGS++))
    fi
}

# IntelGraph-specific patterns to detect
check_intelgraph_secrets() {
    local file="$1"
    local line_num=0
    
    while IFS= read -r line; do
        ((line_num++))
        
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        
        # Convert line to lowercase for case-insensitive matching
        line_lower=$(echo "$line" | tr '[:upper:]' '[:lower:]')
        
        # IntelGraph API tokens (format: ig_[env]_[random])
        if echo "$line" | grep -qE 'ig_[a-z]+_[a-zA-Z0-9]{32,64}'; then
            log_violation "$file" "$line_num" "IntelGraph API Token" "ERROR" "$(echo "$line" | sed 's/ig_[a-z]*_[a-zA-Z0-9]\{10\}/ig_***_***********/g')"
        fi
        
        # Neo4j credentials
        if echo "$line_lower" | grep -qE '(neo4j_password|neo4j_user).*[=:][[:space:]]*["\']?[a-zA-Z0-9]{8,}'; then
            log_violation "$file" "$line_num" "Neo4j Credentials" "ERROR" "[REDACTED]"
        fi
        
        # PostgreSQL connection strings
        if echo "$line" | grep -qE 'postgres(ql)?://[^[:space:]]*:[^[:space:]]*@[^[:space:]]+'; then
            log_violation "$file" "$line_num" "PostgreSQL Connection String" "ERROR" "postgres://[REDACTED]"
        fi
        
        # Redis credentials
        if echo "$line_lower" | grep -qE 'redis[_-]?(password|auth).*[=:][[:space:]]*["\']?[a-zA-Z0-9]{8,}'; then
            log_violation "$file" "$line_num" "Redis Credentials" "ERROR" "[REDACTED]"
        fi
        
        # JWT secrets
        if echo "$line_lower" | grep -qE 'jwt[_-]?secret.*[=:][[:space:]]*["\']?[a-zA-Z0-9+/]{20,}'; then
            log_violation "$file" "$line_num" "JWT Secret" "ERROR" "[REDACTED]"
        fi
        
        # Encryption keys
        if echo "$line_lower" | grep -qE '(encryption[_-]?key|secret[_-]?key).*[=:][[:space:]]*["\']?[a-zA-Z0-9+/=]{16,}'; then
            log_violation "$file" "$line_num" "Encryption Key" "ERROR" "[REDACTED]"
        fi
        
        # Database URLs with credentials
        if echo "$line" | grep -qE 'DATABASE_URL.*://[^[:space:]]*:[^[:space:]]*@'; then
            log_violation "$file" "$line_num" "Database URL with Credentials" "ERROR" "DATABASE_URL=***://[REDACTED]"
        fi
        
        # Private keys (PEM format)
        if echo "$line" | grep -qE '-----BEGIN [A-Z ]*PRIVATE KEY-----'; then
            log_violation "$file" "$line_num" "Private Key" "ERROR" "-----BEGIN ***PRIVATE KEY-----"
        fi
        
        # Certificate files
        if echo "$line" | grep -qE '-----BEGIN CERTIFICATE-----'; then
            log_violation "$file" "$line_num" "Certificate" "WARNING" "-----BEGIN CERTIFICATE-----"
        fi
        
        # Hardcoded passwords
        if echo "$line_lower" | grep -qE '(password|pwd)["\']?[[:space:]]*[=:][[:space:]]*["\']?[a-zA-Z0-9!@#$%^&*]{6,}["\']?[[:space:]]*$' && \
           ! echo "$line_lower" | grep -qE '(example|sample|test|demo|placeholder|\*\*\*|xxx|redacted)'; then
            log_violation "$file" "$line_num" "Hardcoded Password" "ERROR" "[REDACTED]"
        fi
        
        # API keys (generic patterns)
        if echo "$line" | grep -qE '(api[_-]?key|apikey)["\']?[[:space:]]*[=:][[:space:]]*["\']?[a-zA-Z0-9]{20,}'; then
            log_violation "$file" "$line_num" "API Key" "ERROR" "[REDACTED]"
        fi
        
        # Access tokens
        if echo "$line" | grep -qE '(access[_-]?token|accesstoken)["\']?[[:space:]]*[=:][[:space:]]*["\']?[a-zA-Z0-9+/=]{20,}'; then
            log_violation "$file" "$line_num" "Access Token" "ERROR" "[REDACTED]"
        fi
        
        # Bearer tokens in headers
        if echo "$line" | grep -qE 'authorization["\']?[[:space:]]*:[[:space:]]*["\']?bearer[[:space:]]+[a-zA-Z0-9+/=]{20,}'; then
            log_violation "$file" "$line_num" "Bearer Token" "ERROR" "Authorization: Bearer [REDACTED]"
        fi
        
        # Webhook URLs with tokens
        if echo "$line" | grep -qE 'webhook.*https://hooks\.(slack|discord|teams)\.com/[a-zA-Z0-9/]{20,}'; then
            log_violation "$file" "$line_num" "Webhook URL with Token" "ERROR" "webhook=https://hooks.***/[REDACTED]"
        fi
        
        # Cloud provider keys
        if echo "$line" | grep -qE 'AKIA[0-9A-Z]{16}'; then
            log_violation "$file" "$line_num" "AWS Access Key" "ERROR" "AKIA[REDACTED]"
        fi
        
        if echo "$line" | grep -qE 'AIza[0-9A-Za-z\-_]{35}'; then
            log_violation "$file" "$line_num" "Google API Key" "ERROR" "AIza[REDACTED]"
        fi
        
        # GitHub tokens
        if echo "$line" | grep -qE 'gh[pousr]_[A-Za-z0-9_]{36,251}'; then
            log_violation "$file" "$line_num" "GitHub Token" "ERROR" "gh*_[REDACTED]"
        fi
        
        # Suspicious environment variable assignments
        if echo "$line_lower" | grep -qE '^[[:space:]]*export[[:space:]]+[a-z_]+[[:space:]]*=[[:space:]]*["\']?[a-zA-Z0-9+/=]{20,}["\']?[[:space:]]*$' && \
           echo "$line_lower" | grep -qE '(secret|key|token|password|credential)'; then
            log_violation "$file" "$line_num" "Suspicious Environment Variable" "WARNING" "export ***=[REDACTED]"
        fi
        
        # Base64 encoded secrets (high entropy)
        if echo "$line" | grep -qE '["\']?[A-Za-z0-9+/]{40,}={0,2}["\']?' && \
           echo "$line_lower" | grep -qE '(secret|key|token|password)'; then
            # Calculate entropy (simplified)
            local content
            content=$(echo "$line" | grep -oE '[A-Za-z0-9+/]{40,}={0,2}')
            local length=${#content}
            if [ "$length" -gt 40 ]; then
                log_violation "$file" "$line_num" "High Entropy Base64 String" "WARNING" "[REDACTED base64 string]"
            fi
        fi
        
    done < "$file"
}

# Function to check for sensitive file patterns
check_sensitive_files() {
    local file="$1"
    local basename
    basename=$(basename "$file")
    
    # Check for sensitive file names
    case "$basename" in
        *private*key* | *privatekey* | *.pem | *.key | *.p12 | *.pfx)
            if [[ ! "$file" =~ (test|spec|fixture|example) ]]; then
                log_violation "$file" "1" "Sensitive File Type" "WARNING" "Potentially sensitive file: $basename"
            fi
            ;;
        .env.* | *credentials* | *secrets*)
            if [[ ! "$file" =~ (example|template|sample|test) ]]; then
                log_violation "$file" "1" "Sensitive File Name" "WARNING" "Potentially sensitive file: $basename"
            fi
            ;;
    esac
}

# Main execution
echo "🔍 Running IntelGraph custom secrets check..."

# Check if no files provided
if [ $# -eq 0 ]; then
    echo "No files to check"
    exit 0
fi

# Process each file
for file in "$@"; do
    if [ -f "$file" ]; then
        # Skip binary files
        if file "$file" | grep -q "text\|empty"; then
            check_sensitive_files "$file"
            check_intelgraph_secrets "$file"
        fi
    fi
done

# Print summary
echo ""
echo "📊 Secrets Check Summary:"
echo -e "${RED}Violations: $VIOLATIONS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

# Exit with error code if violations found
if [ $VIOLATIONS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Secrets check failed! Fix the violations above before committing.${NC}"
    echo ""
    echo "💡 Tips:"
    echo "  - Use environment variables for secrets"
    echo "  - Store secrets in external secret management systems"
    echo "  - Use placeholder values in configuration files"
    echo "  - Add sensitive files to .gitignore"
    exit 1
else
    echo -e "${GREEN}✅ No secret violations found!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Please review the warnings above${NC}"
    fi
    exit 0
fi