#!/usr/bin/env bash
# =============================================================================
# Summit v4.0 - Terraform Backend Setup
# =============================================================================
# This script creates the S3 bucket and DynamoDB table required for Terraform
# state management. Run this ONCE before deploying infrastructure.
# =============================================================================
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-west-2}"
STATE_BUCKET="summit-terraform-state"
LOCK_TABLE="summit-terraform-locks"

echo "Setting up Terraform backend infrastructure..."

# Create S3 bucket for state
echo "Creating S3 bucket: ${STATE_BUCKET}"
if aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
    echo "Bucket already exists"
else
    aws s3api create-bucket \
        --bucket "${STATE_BUCKET}" \
        --region "${AWS_REGION}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}"

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${STATE_BUCKET}" \
        --versioning-configuration Status=Enabled

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${STATE_BUCKET}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms"
                },
                "BucketKeyEnabled": true
            }]
        }'

    # Block public access
    aws s3api put-public-access-block \
        --bucket "${STATE_BUCKET}" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }'

    echo "S3 bucket created and configured"
fi

# Create DynamoDB table for state locking
echo "Creating DynamoDB table: ${LOCK_TABLE}"
if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" 2>/dev/null; then
    echo "DynamoDB table already exists"
else
    aws dynamodb create-table \
        --table-name "${LOCK_TABLE}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${AWS_REGION}"

    aws dynamodb wait table-exists \
        --table-name "${LOCK_TABLE}" \
        --region "${AWS_REGION}"

    echo "DynamoDB table created"
fi

echo ""
echo "Terraform backend setup complete!"
echo ""
echo "Backend configuration:"
echo "  S3 Bucket:      ${STATE_BUCKET}"
echo "  DynamoDB Table: ${LOCK_TABLE}"
echo "  Region:         ${AWS_REGION}"
