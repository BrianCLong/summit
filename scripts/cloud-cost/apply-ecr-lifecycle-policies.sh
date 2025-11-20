#!/bin/bash
# File: scripts/cloud-cost/apply-ecr-lifecycle-policies.sh
# Description: Apply lifecycle policies to all ECR repositories
# Estimated Savings: $5-15/month

set -euo pipefail

# Configuration
REGION=${AWS_REGION:-us-east-1}
POLICY_FILE=${POLICY_FILE:-"standard-lifecycle.json"}
POLICY_DIR="/home/user/summit/terraform/templates/ecr-lifecycle-policies"
DRY_RUN=${DRY_RUN:-true}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "========================================="
echo "ECR Lifecycle Policy Application"
echo "========================================="
echo "Region: $REGION"
echo "Policy: $POLICY_FILE"
echo "Dry Run: $DRY_RUN"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found"
    exit 1
fi

# Check policy file exists
if [ ! -f "$POLICY_DIR/$POLICY_FILE" ]; then
    log_error "Policy file not found: $POLICY_DIR/$POLICY_FILE"
    echo ""
    echo "Available policies:"
    ls -1 "$POLICY_DIR"/*.json
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    log_error "AWS credentials not configured"
    exit 1
fi

# Get all ECR repositories
log_info "Fetching ECR repositories..."
REPOSITORIES=$(aws ecr describe-repositories \
    --region "$REGION" \
    --query 'repositories[*].repositoryName' \
    --output text)

if [ -z "$REPOSITORIES" ]; then
    log_warn "No ECR repositories found"
    exit 0
fi

REPO_COUNT=$(echo "$REPOSITORIES" | wc -w)
log_info "Found $REPO_COUNT repositories"
echo ""

# Process each repository
APPLIED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

for REPO in $REPOSITORIES; do
    echo "=== Repository: $REPO ==="

    # Check if policy already exists
    EXISTING_POLICY=$(aws ecr get-lifecycle-policy \
        --region "$REGION" \
        --repository-name "$REPO" \
        2>/dev/null || echo "")

    if [ -n "$EXISTING_POLICY" ]; then
        log_warn "Repository already has a lifecycle policy"

        if [ "$DRY_RUN" = "false" ]; then
            read -p "Overwrite existing policy? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Skipping repository"
                SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                echo ""
                continue
            fi
        else
            log_info "[DRY RUN] Would prompt to overwrite policy"
            echo ""
            continue
        fi
    fi

    # Get image count before cleanup
    IMAGE_COUNT=$(aws ecr list-images \
        --region "$REGION" \
        --repository-name "$REPO" \
        --query 'length(imageIds)' \
        --output text)

    echo "  Current image count: $IMAGE_COUNT"

    # Apply lifecycle policy
    if [ "$DRY_RUN" = "false" ]; then
        log_info "Applying lifecycle policy..."

        if aws ecr put-lifecycle-policy \
            --region "$REGION" \
            --repository-name "$REPO" \
            --lifecycle-policy-text "file://$POLICY_DIR/$POLICY_FILE"; then

            log_info "Successfully applied policy"
            APPLIED_COUNT=$((APPLIED_COUNT + 1))
        else
            log_error "Failed to apply policy"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    else
        log_info "[DRY RUN] Would apply lifecycle policy"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    fi

    echo ""
done

echo "========================================="
echo "Summary"
echo "========================================="
echo "Total repositories: $REPO_COUNT"

if [ "$DRY_RUN" = "true" ]; then
    echo "Would apply policy to: $APPLIED_COUNT repositories"
    echo "Would skip: $SKIPPED_COUNT repositories"
else
    echo "Applied: $APPLIED_COUNT"
    echo "Skipped: $SKIPPED_COUNT"
    echo "Errors: $ERROR_COUNT"
fi

echo ""

if [ "$DRY_RUN" = "true" ]; then
    log_warn "This was a dry run. To actually apply policies, run:"
    echo "  DRY_RUN=false $0"
    echo ""
    log_info "To use a different policy:"
    echo "  POLICY_FILE=aggressive-cleanup.json $0"
fi

echo ""
log_info "Policy will take effect within 24 hours"
log_info "Monitor savings with: aws ecr describe-repositories --region $REGION"

exit 0
