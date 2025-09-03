#!/bin/bash
# API Key exposure detection script for IntelGraph
# Scans for exposed API keys, tokens, and credentials in various formats

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize counters
VIOLATIONS=0
WARNINGS=0

# Function to log findings
log_finding() {
    local file="$1"
    local line_num="$2"
    local pattern="$3"
    local severity="$4"
    local content="$5"
    local provider="$6"
    
    if [ "$severity" = "ERROR" ]; then
        echo -e "${RED}[CRITICAL]${NC} $file:$line_num"
        echo -e "  ${RED}Provider: $provider${NC}"
        echo -e "  ${RED}Pattern: $pattern${NC}"
        echo -e "  ${RED}Content: $content${NC}"
        ((VIOLATIONS++))
    else
        echo -e "${YELLOW}[WARNING]${NC} $file:$line_num"
        echo -e "  ${YELLOW}Provider: $provider${NC}"
        echo -e "  ${YELLOW}Pattern: $pattern${NC}"
        echo -e "  ${YELLOW}Content: $content${NC}"
        ((WARNINGS++))
    fi
}

# Function to check for various API key patterns
check_api_keys() {
    local file="$1"
    local line_num=0
    
    while IFS= read -r line; do
        ((line_num++))
        
        # Skip empty lines and comments (but check commented keys as they might be accidentally committed)
        [[ -z "$line" ]] && continue
        
        # AWS Access Keys
        if echo "$line" | grep -qE 'AKIA[0-9A-Z]{16}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/AKIA[0-9A-Z]\{16\}/AKIA[REDACTED]/g')
            log_finding "$file" "$line_num" "AWS Access Key ID" "ERROR" "$redacted" "AWS"
        fi
        
        # AWS Secret Keys
        if echo "$line" | grep -qE '[A-Za-z0-9+/]{40}' && echo "$line" | grep -iqE 'aws.*secret'; then
            log_finding "$file" "$line_num" "AWS Secret Access Key" "ERROR" "[REDACTED AWS Secret]" "AWS"
        fi
        
        # Google API Keys
        if echo "$line" | grep -qE 'AIza[0-9A-Za-z\-_]{35}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/AIza[0-9A-Za-z\-_]\{35\}/AIza[REDACTED]/g')
            log_finding "$file" "$line_num" "Google API Key" "ERROR" "$redacted" "Google"
        fi
        
        # GitHub Personal Access Tokens
        if echo "$line" | grep -qE 'gh[pousr]_[A-Za-z0-9_]{36,251}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/gh[pousr]_[A-Za-z0-9_]\{36,251\}/gh*_[REDACTED]/g')
            log_finding "$file" "$line_num" "GitHub Personal Access Token" "ERROR" "$redacted" "GitHub"
        fi
        
        # GitHub App Tokens
        if echo "$line" | grep -qE 'v1\.[a-f0-9]{40}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/v1\.[a-f0-9]\{40\}/v1.[REDACTED]/g')
            log_finding "$file" "$line_num" "GitHub App Token" "ERROR" "$redacted" "GitHub"
        fi
        
        # Slack Bot Tokens
        if echo "$line" | grep -qE 'xoxb-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/xoxb-[0-9]\{12\}-[0-9]\{12\}-[a-zA-Z0-9]\{24\}/xoxb-[REDACTED]/g')
            log_finding "$file" "$line_num" "Slack Bot Token" "ERROR" "$redacted" "Slack"
        fi
        
        # Slack App Tokens
        if echo "$line" | grep -qE 'xapp-[0-9]-[A-Z0-9]+-[0-9]+-[a-z0-9]+'; then
            log_finding "$file" "$line_num" "Slack App Token" "ERROR" "xapp-[REDACTED]" "Slack"
        fi
        
        # Slack User Tokens
        if echo "$line" | grep -qE 'xoxp-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}'; then
            log_finding "$file" "$line_num" "Slack User Token" "ERROR" "xoxp-[REDACTED]" "Slack"
        fi
        
        # Discord Bot Tokens
        if echo "$line" | grep -qE '[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/[MN][A-Za-z\d]\{23\}\.[\w-]\{6\}\.[\w-]\{27\}/[DISCORD_BOT_TOKEN_REDACTED]/g')
            log_finding "$file" "$line_num" "Discord Bot Token" "ERROR" "$redacted" "Discord"
        fi
        
        # Azure Storage Account Keys
        if echo "$line" | grep -qE 'DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}'; then
            log_finding "$file" "$line_num" "Azure Storage Account Key" "ERROR" "DefaultEndpointsProtocol=https;AccountName=***;AccountKey=[REDACTED]" "Azure"
        fi
        
        # Stripe API Keys
        if echo "$line" | grep -qE '(sk|pk)_(test|live)_[A-Za-z0-9]{24,}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/\(sk\|pk\)_\(test\|live\)_[A-Za-z0-9]\{24,\}/\1_\2_[REDACTED]/g')
            log_finding "$file" "$line_num" "Stripe API Key" "ERROR" "$redacted" "Stripe"
        fi
        
        # PayPal Client Secrets
        if echo "$line" | grep -qE 'E[A-Za-z0-9\-_]{80,}'; then
            if echo "$line" | grep -iqE 'paypal\|client.secret'; then
                log_finding "$file" "$line_num" "PayPal Client Secret" "ERROR" "E[REDACTED]" "PayPal"
            fi
        fi
        
        # Twilio API Keys
        if echo "$line" | grep -qE 'AC[a-z0-9]{32}' || echo "$line" | grep -qE 'SK[a-z0-9]{32}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/\(AC\|SK\)[a-z0-9]\{32\}/\1[REDACTED]/g')
            log_finding "$file" "$line_num" "Twilio API Key" "ERROR" "$redacted" "Twilio"
        fi
        
        # SendGrid API Keys
        if echo "$line" | grep -qE 'SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}'; then
            log_finding "$file" "$line_num" "SendGrid API Key" "ERROR" "SG.[REDACTED]" "SendGrid"
        fi
        
        # Mailgun API Keys
        if echo "$line" | grep -qE 'key-[a-z0-9]{32}'; then
            local redacted
            redacted=$(echo "$line" | sed 's/key-[a-z0-9]\{32\}/key-[REDACTED]/g')
            log_finding "$file" "$line_num" "Mailgun API Key" "ERROR" "$redacted" "Mailgun"
        fi
        
        # Firebase Keys
        if echo "$line" | grep -qE 'AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}'; then
            log_finding "$file" "$line_num" "Firebase Server Key" "ERROR" "AAAA[REDACTED]" "Firebase"
        fi
        
        # Shopify Access Tokens
        if echo "$line" | grep -qE 'shpat_[a-fA-F0-9]{32}'; then
            log_finding "$file" "$line_num" "Shopify Access Token" "ERROR" "shpat_[REDACTED]" "Shopify"
        fi
        
        # Square Access Tokens
        if echo "$line" | grep -qE 'sq0atp-[0-9A-Za-z\-_]{22}'; then
            log_finding "$file" "$line_num" "Square Access Token" "ERROR" "sq0atp-[REDACTED]" "Square"
        fi
        
        # Generic API Key Patterns
        if echo "$line" | grep -qiE '(api[_-]?key|apikey)["\'\s]*[=:]["\'\s]*[a-zA-Z0-9+/=]{20,}' && \
           ! echo "$line" | grep -qiE '(example|sample|test|demo|placeholder|\*\*\*|xxx|redacted|your[_-]?api[_-]?key)'; then
            local key_part
            key_part=$(echo "$line" | grep -oiE '[a-zA-Z0-9+/=]{20,}' | head -1)
            local masked_key="${key_part:0:4}[REDACTED]"
            log_finding "$file" "$line_num" "Generic API Key" "WARNING" "api_key=$masked_key" "Unknown"
        fi
        
        # Bearer Tokens
        if echo "$line" | grep -qE 'Bearer\s+[A-Za-z0-9+/=]{20,}' && \
           ! echo "$line" | grep -qiE '(example|sample|test|demo|placeholder)'; then
            log_finding "$file" "$line_num" "Bearer Token" "WARNING" "Bearer [REDACTED]" "Unknown"
        fi
        
        # JWT Tokens (basic pattern)
        if echo "$line" | grep -qE 'eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]*' && \
           ! echo "$line" | grep -qiE '(example|sample|test|demo)'; then
            log_finding "$file" "$line_num" "JWT Token" "WARNING" "eyJ[REDACTED JWT TOKEN]" "JWT"
        fi
        
        # Database Connection Strings with Credentials
        if echo "$line" | grep -qE '(mongodb|mysql|postgres|redis)://[^:]+:[^@]+@[^/]+'; then
            local proto
            proto=$(echo "$line" | grep -oE '(mongodb|mysql|postgres|redis)://' | head -1)
            log_finding "$file" "$line_num" "Database Connection String" "ERROR" "${proto//://}://[REDACTED]" "Database"
        fi
        
        # SSH Private Keys
        if echo "$line" | grep -qE '-----BEGIN [A-Z ]*PRIVATE KEY-----'; then
            log_finding "$file" "$line_num" "SSH Private Key" "ERROR" "-----BEGIN ***PRIVATE KEY-----" "SSH"
        fi
        
        # Certificate Files
        if echo "$line" | grep -qE '-----BEGIN CERTIFICATE-----'; then
            log_finding "$file" "$line_num" "Certificate" "WARNING" "-----BEGIN CERTIFICATE-----" "Certificate"
        fi
        
        # Webhook URLs with secrets
        if echo "$line" | grep -qE 'https://hooks\.(slack|discord|teams|github)\.com/[A-Za-z0-9/_-]{20,}'; then
            local domain
            domain=$(echo "$line" | grep -oE 'hooks\.(slack|discord|teams|github)\.com' | head -1)
            log_finding "$file" "$line_num" "Webhook URL with Token" "ERROR" "https://$domain/[REDACTED]" "Webhook"
        fi
        
        # Password fields with actual passwords
        if echo "$line" | grep -qiE 'password["\'\s]*[=:]["\'\s]*[^"\'\s]{8,}' && \
           ! echo "$line" | grep -qiE '(password["\'\s]*[=:]["\'\s]*["\']*(null|none|empty|\*+|x+|redacted|placeholder|example))' && \
           ! echo "$line" | grep -qE '\$\{|\%\{|\{\{'; then  # Skip template variables
            log_finding "$file" "$line_num" "Hardcoded Password" "ERROR" "password=[REDACTED]" "Password"
        fi
        
        # Check for suspicious high-entropy strings that might be secrets
        if echo "$line" | grep -qE '[A-Za-z0-9+/=]{40,}' && \
           echo "$line" | grep -qiE '(secret|key|token|credential|auth)' && \
           ! echo "$line" | grep -qiE '(example|sample|test|demo|placeholder)'; then
            # Calculate a simple entropy score
            local string
            string=$(echo "$line" | grep -oE '[A-Za-z0-9+/=]{40,}' | head -1)
            local length=${#string}
            if [ "$length" -gt 30 ]; then
                log_finding "$file" "$line_num" "High Entropy String" "WARNING" "[REDACTED high entropy string]" "Unknown"
            fi
        fi
        
    done < "$file"
}

# Function to check file extensions and names for sensitive content
check_file_patterns() {
    local file="$1"
    local basename
    basename=$(basename "$file")
    
    # Check for suspicious file names
    if echo "$basename" | grep -qiE '(secret|credential|key|token|password|private)' && \
       ! echo "$basename" | grep -qiE '(example|sample|template|test|spec)'; then
        log_finding "$file" "1" "Suspicious File Name" "WARNING" "File name suggests sensitive content: $basename" "File Pattern"
    fi
    
    # Check for key files
    if echo "$basename" | grep -qE '\.(pem|key|p12|pfx|crt|cer)$'; then
        log_finding "$file" "1" "Key/Certificate File" "WARNING" "Key or certificate file: $basename" "File Pattern"
    fi
}

# Main execution
echo -e "${BLUE}🔍 Running IntelGraph API key exposure check...${NC}"

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
            check_file_patterns "$file"
            check_api_keys "$file"
        fi
    fi
done

# Print summary
echo ""
echo -e "${BLUE}📊 API Key Check Summary:${NC}"
echo -e "${RED}Critical Issues: $VIOLATIONS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

# Exit with error code if violations found
if [ $VIOLATIONS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ API key exposure check failed! Critical issues found.${NC}"
    echo ""
    echo -e "${BLUE}💡 Remediation Steps:${NC}"
    echo "  1. Remove all hardcoded API keys, tokens, and credentials"
    echo "  2. Use environment variables or secret management systems"
    echo "  3. Rotate any exposed credentials immediately"
    echo "  4. Add sensitive files to .gitignore"
    echo "  5. Consider using tools like git-secrets or pre-commit hooks"
    echo ""
    echo -e "${BLUE}🔒 Secret Management Best Practices:${NC}"
    echo "  • Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault"
    echo "  • Use environment variables for runtime configuration"
    echo "  • Implement credential rotation policies"
    echo "  • Use IAM roles and managed identities when possible"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ No critical API key exposures found!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Please review the warnings above${NC}"
        exit 0
    fi
    exit 0
fi