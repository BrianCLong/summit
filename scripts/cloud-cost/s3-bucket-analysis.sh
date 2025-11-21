#!/bin/bash
# File: scripts/cloud-cost/s3-bucket-analysis.sh
# Description: Analyze S3 bucket sizes and lifecycle policies

echo "=== S3 Bucket Cost Analysis ==="
echo ""

# Requires AWS CLI with appropriate IAM permissions

for BUCKET in $(aws s3 ls | awk '{print $3}'); do
  echo "=== Bucket: $BUCKET ==="

  # Get total size
  SIZE=$(aws s3 ls s3://$BUCKET --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3}')
  SIZE_GB=$(echo "scale=2; $SIZE / 1024 / 1024 / 1024" | bc)

  echo "  Size: ${SIZE_GB} GB"

  # Check lifecycle policy
  LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "  Lifecycle: ✅ Configured"
  else
    echo "  Lifecycle: ❌ NOT CONFIGURED (potential waste)"
  fi

  # Check versioning
  VERSIONING=$(aws s3api get-bucket-versioning --bucket $BUCKET | jq -r '.Status // "Disabled"')
  echo "  Versioning: $VERSIONING"

  # Check storage class distribution
  echo "  Storage Classes:"
  aws s3api list-objects-v2 --bucket $BUCKET --query 'Contents[].StorageClass' --output text 2>/dev/null | sort | uniq -c

  # Check for incomplete multipart uploads
  INCOMPLETE=$(aws s3api list-multipart-uploads --bucket $BUCKET 2>/dev/null | jq '.Uploads | length')
  if [ "$INCOMPLETE" != "null" ] && [ "$INCOMPLETE" -gt 0 ]; then
    echo "  ⚠️  Incomplete Multipart Uploads: $INCOMPLETE (clean up to save costs)"
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- Buckets without lifecycle policies: Implement transitions to Glacier/IA"
echo "- Large Standard storage: Enable Intelligent-Tiering for unpredictable access"
echo "- Versioned buckets: Add lifecycle rules to delete old versions after 30 days"
