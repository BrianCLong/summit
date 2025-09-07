#!/bin/bash
set -euo pipefail

# WORM Compliance Verification for Federal Buckets
# Validates 20-year COMPLIANCE mode Object Lock across all federal audit buckets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_PROFILE="${AWS_PROFILE:-Maestro}"
BUCKET_PREFIX="${BUCKET_PREFIX:-intelgraph-federal}"
REQUIRED_RETENTION_YEARS=20

note() {
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

check_bucket_worm() {
    local bucket="$1"
    local bucket_type="$2"
    
    note "Checking WORM compliance for $bucket ($bucket_type)"
    
    # Check if bucket exists
    if ! aws --profile "$AWS_PROFILE" s3api head-bucket --bucket "$bucket" &>/dev/null; then
        echo "❌ WORM_FAIL $bucket - Bucket does not exist"
        return 1
    fi
    
    # Get Object Lock configuration
    local config
    if ! config=$(aws --profile "$AWS_PROFILE" s3api get-object-lock-configuration --bucket "$bucket" --output json 2>/dev/null); then
        echo "❌ WORM_FAIL $bucket - No Object Lock configuration found"
        return 1
    fi
    
    # Extract retention mode and duration
    local mode
    local years
    mode=$(echo "$config" | jq -r '.ObjectLockConfiguration.Rule.DefaultRetention.Mode // "NONE"')
    years=$(echo "$config" | jq -r '.ObjectLockConfiguration.Rule.DefaultRetention.Years // 0')
    
    # Validate COMPLIANCE mode
    if [[ "$mode" != "COMPLIANCE" ]]; then
        echo "❌ WORM_FAIL $bucket - Mode is '$mode', expected 'COMPLIANCE'"
        return 1
    fi
    
    # Validate retention period
    if [[ "$years" -lt "$REQUIRED_RETENTION_YEARS" ]]; then
        echo "❌ WORM_FAIL $bucket - Retention is $years years, required >= $REQUIRED_RETENTION_YEARS"
        return 1
    fi
    
    # Check versioning is enabled (required for Object Lock)
    local versioning
    versioning=$(aws --profile "$AWS_PROFILE" s3api get-bucket-versioning --bucket "$bucket" --query 'Status' --output text 2>/dev/null || echo "Disabled")
    
    if [[ "$versioning" != "Enabled" ]]; then
        echo "❌ WORM_FAIL $bucket - Versioning is '$versioning', must be 'Enabled'"
        return 1
    fi
    
    # Check public access is blocked
    local public_block
    public_block=$(aws --profile "$AWS_PROFILE" s3api get-public-access-block --bucket "$bucket" --query 'PublicAccessBlockConfiguration' --output json 2>/dev/null || echo '{}')
    
    local block_public_acls
    local block_public_policy
    local ignore_public_acls
    local restrict_public_buckets
    
    block_public_acls=$(echo "$public_block" | jq -r '.BlockPublicAcls // false')
    block_public_policy=$(echo "$public_block" | jq -r '.BlockPublicPolicy // false')
    ignore_public_acls=$(echo "$public_block" | jq -r '.IgnorePublicAcls // false')
    restrict_public_buckets=$(echo "$public_block" | jq -r '.RestrictPublicBuckets // false')
    
    if [[ "$block_public_acls" != "true" ]] || [[ "$block_public_policy" != "true" ]] || \
       [[ "$ignore_public_acls" != "true" ]] || [[ "$restrict_public_buckets" != "true" ]]; then
        echo "❌ WORM_FAIL $bucket - Public access not fully blocked"
        return 1
    fi
    
    # Check encryption is enabled
    local encryption
    encryption=$(aws --profile "$AWS_PROFILE" s3api get-bucket-encryption --bucket "$bucket" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "None")
    
    if [[ "$encryption" != "aws:kms" ]]; then
        echo "❌ WORM_FAIL $bucket - Encryption is '$encryption', expected 'aws:kms'"
        return 1
    fi
    
    # Check lifecycle policy exists (for cost optimization)
    local lifecycle
    lifecycle=$(aws --profile "$AWS_PROFILE" s3api get-bucket-lifecycle-configuration --bucket "$bucket" --query 'Rules[0].Status' --output text 2>/dev/null || echo "None")
    
    if [[ "$lifecycle" == "None" ]]; then
        echo "⚠️  WORM_WARN $bucket - No lifecycle policy configured (cost optimization)"
    fi
    
    echo "✅ WORM_OK $bucket ($years years COMPLIANCE mode)"
    return 0
}

main() {
    note "Starting WORM compliance verification for federal buckets"
    note "AWS Profile: $AWS_PROFILE"
    note "Required retention: $REQUIRED_RETENTION_YEARS years"
    
    # Define federal bucket types and expected names
    declare -A buckets=(
        ["audit"]="$BUCKET_PREFIX-audit"
        ["billing"]="$BUCKET_PREFIX-billing" 
        ["event"]="$BUCKET_PREFIX-event"
        ["breakglass"]="$BUCKET_PREFIX-breakglass"
        ["compliance"]="$BUCKET_PREFIX-compliance"
    )
    
    # Check if we can list buckets
    if ! aws --profile "$AWS_PROFILE" s3api list-buckets &>/dev/null; then
        echo "❌ WORM_FAIL - Cannot access AWS S3 with profile $AWS_PROFILE"
        exit 1
    fi
    
    local failed_buckets=0
    local total_buckets=${#buckets[@]}
    
    # Check each federal bucket
    for bucket_type in "${!buckets[@]}"; do
        local bucket_name="${buckets[$bucket_type]}"
        
        # Try to find bucket with suffix if exact name doesn't exist
        local actual_bucket
        actual_bucket=$(aws --profile "$AWS_PROFILE" s3api list-buckets --query "Buckets[?starts_with(Name, \`$bucket_name\`)].Name" --output text | head -n1)
        
        if [[ -n "$actual_bucket" ]]; then
            bucket_name="$actual_bucket"
        fi
        
        if ! check_bucket_worm "$bucket_name" "$bucket_type"; then
            ((failed_buckets++))
        fi
    done
    
    # Summary
    note "WORM compliance check complete"
    echo "Buckets checked: $total_buckets"
    echo "Failures: $failed_buckets"
    
    if [[ $failed_buckets -eq 0 ]]; then
        echo "✅ ALL WORM COMPLIANCE CHECKS PASSED"
        
        # Generate compliance report
        cat > worm-compliance-report.txt <<EOF
IntelGraph Federal WORM Compliance Report
Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
AWS Profile: $AWS_PROFILE

COMPLIANCE STATUS: ✅ PASS

Verified Buckets:
EOF
        
        for bucket_type in "${!buckets[@]}"; do
            local bucket_name="${buckets[$bucket_type]}"
            local actual_bucket
            actual_bucket=$(aws --profile "$AWS_PROFILE" s3api list-buckets --query "Buckets[?starts_with(Name, \`$bucket_name\`)].Name" --output text | head -n1)
            if [[ -n "$actual_bucket" ]]; then
                bucket_name="$actual_bucket"
            fi
            
            local config
            config=$(aws --profile "$AWS_PROFILE" s3api get-object-lock-configuration --bucket "$bucket_name" --output json 2>/dev/null || echo '{}')
            local years
            years=$(echo "$config" | jq -r '.ObjectLockConfiguration.Rule.DefaultRetention.Years // 0')
            
            echo "- $bucket_type: $bucket_name (${years}-year COMPLIANCE)" >> worm-compliance-report.txt
        done
        
        cat >> worm-compliance-report.txt <<EOF

Requirements Verified:
✅ Object Lock enabled with COMPLIANCE mode
✅ Retention period >= $REQUIRED_RETENTION_YEARS years
✅ Versioning enabled
✅ Public access blocked
✅ KMS encryption enabled

This report validates that all federal audit buckets meet
20-year WORM retention requirements for ATO compliance.
EOF
        
        echo "Report generated: worm-compliance-report.txt"
        exit 0
    else
        echo "❌ WORM COMPLIANCE FAILURES DETECTED"
        echo "Fix the above issues before proceeding with ATO submission"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--profile PROFILE] [--prefix PREFIX]"
        echo "Verify WORM compliance for IntelGraph federal buckets"
        echo ""
        echo "Options:"
        echo "  --profile PROFILE  AWS profile to use (default: $AWS_PROFILE)"
        echo "  --prefix PREFIX    Bucket name prefix (default: $BUCKET_PREFIX)"
        exit 0
        ;;
    --profile)
        AWS_PROFILE="$2"
        shift 2
        ;;
    --prefix)
        BUCKET_PREFIX="$2"
        shift 2
        ;;
esac

main "$@"