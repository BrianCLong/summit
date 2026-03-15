#!/bin/bash
set -e

# scan-secrets.sh - Lightweight secret scanning script
# Checks for API keys, tokens, and credentials in staged files.

DRY_RUN=false
TEST_MODE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --test) TEST_MODE=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Starting Secret Scan..."

# Regex patterns for common secrets
PATTERNS=(
    "AKIA[0-9A-Z]{16}" # AWS Access Key ID
    "([A-Za-z0-9+/]{40})" # AWS Secret Access Key (Potential)
    "sk_live_[0-9a-zA-Z]{24}" # Stripe Secret Key
    "https://hooks\.slack\.com/services/T[a-zA-Z0-9_]{8}/B[a-zA-Z0-9_]{8}/[a-zA-Z0-9_]{24}" # Slack Webhook
    "EYJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+" # JWT (Potential)
    "-----BEGIN RSA PRIVATE KEY-----" # Private Key
)

if [ "$TEST_MODE" = true ]; then
    echo "[TEST MODE] Running secret scan on temporary test file..."
    TEST_FILE=$(mktemp)
    echo "This is a test file with a fake secret: AKIA1234567890ABCDEF" > "$TEST_FILE"

    if grep -E "${PATTERNS[0]}" "$TEST_FILE" > /dev/null; then
        echo "Test passed: Secret detected."
        rm "$TEST_FILE"
        exit 0
    else
        echo "Test failed: Secret not detected."
        rm "$TEST_FILE"
        exit 1
    fi
fi

# Get staged files
FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$FILES" ]; then
    echo "No staged files to scan."
    exit 0
fi

FAILED=false

for FILE in $FILES; do
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would scan file: $FILE"
        continue
    fi

    for PATTERN in "${PATTERNS[@]}"; do
        if grep -E "$PATTERN" "$FILE" > /dev/null; then
            echo "CRITICAL: Potential secret detected in $FILE (Pattern: $PATTERN)"
            FAILED=true
        fi
    done
done

if [ "$FAILED" = true ]; then
    echo "Secret scan failed. Please remove the secrets before committing."
    exit 1
fi

echo "Secret scan passed."
