# S3 Lifecycle Policy Templates

Ready-to-use S3 lifecycle policies for cost optimization.

**Estimated Savings: $20-50/month** (depending on bucket sizes)

## Policy Templates

### 1. Backups Lifecycle (`backups-lifecycle.json`)

**Use Case**: Database backups, application backups, disaster recovery archives

**Policy**:
- Day 0-29: STANDARD ($0.023/GB)
- Day 30-89: STANDARD_IA ($0.0125/GB) - 46% cheaper
- Day 90-179: GLACIER ($0.004/GB) - 83% cheaper
- Day 180-364: DEEP_ARCHIVE ($0.00099/GB) - 96% cheaper
- Day 365+: Expired (deleted)

**Noncurrent Versions** (if versioning enabled):
- Day 0-6: STANDARD
- Day 7-29: STANDARD_IA
- Day 30-89: GLACIER
- Day 90+: Expired

**Savings**: ~70% on storage costs after 90 days

### 2. Logs Lifecycle (`logs-lifecycle.json`)

**Use Case**: Application logs, access logs, audit logs

**Policy**:
- Day 0-29: STANDARD
- Day 30-89: STANDARD_IA
- Day 90-179: GLACIER
- Day 180+: Expired (deleted)

**Noncurrent Versions**:
- Expired after 7 days

**Savings**: ~60% on storage costs, automatic cleanup

### 3. Intelligent Tiering (`intelligent-tiering.json`)

**Use Case**: Unpredictable access patterns, mixed hot/cold data

**Policy**:
- Automatically moves objects between access tiers
- No retrieval fees (unlike GLACIER)
- Monitoring fee: $0.0025 per 1,000 objects

**How it works**:
- Frequent Access tier: $0.023/GB (same as STANDARD)
- Infrequent Access tier: $0.0125/GB (after 30 days)
- Archive Instant Access: $0.004/GB (after 90 days)
- Archive Access: $0.0036/GB (after 90 days)
- Deep Archive Access: $0.00099/GB (after 180 days)

**Savings**: 30-70% depending on access patterns

### 4. Artifacts Lifecycle (`artifacts-lifecycle.json`)

**Use Case**: Build artifacts, CI/CD outputs, temporary files

**Policy**:
- Build artifacts: Kept 180 days, IA after 60 days
- Temp files: Deleted after 7 days
- Incomplete multipart uploads: Cleaned up after 7 days

**Savings**: ~50% on artifact storage, eliminates temp file waste

## Usage

### Option 1: AWS CLI

```bash
# Apply lifecycle policy to a bucket
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-backup-bucket \
  --lifecycle-configuration file://backups-lifecycle.json

# Verify policy was applied
aws s3api get-bucket-lifecycle-configuration \
  --bucket my-backup-bucket
```

### Option 2: Terraform

```hcl
resource "aws_s3_bucket" "backups" {
  bucket = "my-backup-bucket"
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup-lifecycle-policy"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 365
    }

    noncurrent_version_transition {
      noncurrent_days = 7
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

### Option 3: Bulk Application Script

```bash
#!/bin/bash
# Apply lifecycle policies to all backup buckets

for bucket in $(aws s3 ls | awk '{print $3}' | grep backup); do
  echo "Applying lifecycle policy to $bucket..."
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$bucket" \
    --lifecycle-configuration file://backups-lifecycle.json
done
```

## Choosing the Right Policy

| Bucket Type | Access Pattern | Recommended Policy | Est. Savings |
|-------------|----------------|-------------------|--------------|
| Database backups | Rarely accessed after 30 days | `backups-lifecycle.json` | 70% |
| Application logs | Read occasionally, old logs unused | `logs-lifecycle.json` | 60% |
| User uploads | Unpredictable | `intelligent-tiering.json` | 30-50% |
| CI/CD artifacts | Kept for debugging, rarely needed | `artifacts-lifecycle.json` | 50% |
| Billing data | Regular analysis | `intelligent-tiering.json` | 40% |
| Audit logs | Compliance retention | `backups-lifecycle.json` (adjust retention) | 60% |

## Cost Comparison

### Example: 1TB of Backup Data

**Without Lifecycle Policy** (STANDARD for 365 days):
- Cost: 1000 GB × $0.023/GB × 12 months = **$276/year**

**With Lifecycle Policy**:
- Month 1 (STANDARD): 1000 GB × $0.023 = $23
- Months 2-3 (STANDARD_IA): 1000 GB × $0.0125 × 2 = $25
- Months 4-6 (GLACIER): 1000 GB × $0.004 × 3 = $12
- Months 7-12 (DEEP_ARCHIVE): 1000 GB × $0.00099 × 6 = $5.94
- **Total: $65.94/year (76% savings = $210 saved)**

## Applying Policies to Existing Buckets

### Audit Current Policies

```bash
# List all buckets and their lifecycle status
for bucket in $(aws s3 ls | awk '{print $3}'); do
  echo "=== $bucket ==="
  aws s3api get-bucket-lifecycle-configuration --bucket "$bucket" 2>/dev/null && echo "✅ Has policy" || echo "❌ No policy"
  echo ""
done
```

### Apply Policies Safely

1. **Test on a single bucket first**:
   ```bash
   aws s3api put-bucket-lifecycle-configuration \
     --bucket test-bucket \
     --lifecycle-configuration file://backups-lifecycle.json
   ```

2. **Wait 24 hours and verify**:
   ```bash
   aws s3api get-bucket-lifecycle-configuration --bucket test-bucket
   ```

3. **Monitor for issues**:
   - Check CloudWatch metrics for `NumberOfObjects` and `BucketSizeBytes`
   - Verify applications can still access needed objects

4. **Roll out to remaining buckets**:
   ```bash
   # Apply to all backup buckets
   for bucket in $(aws s3 ls | awk '{print $3}' | grep backup); do
     aws s3api put-bucket-lifecycle-configuration \
       --bucket "$bucket" \
       --lifecycle-configuration file://backups-lifecycle.json
   done
   ```

## Monitoring Savings

### CloudWatch Metrics

```bash
# Get storage metrics by storage class
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=my-bucket Name=StorageType,Value=StandardStorage \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average
```

### S3 Storage Lens

Enable S3 Storage Lens for cost analysis:
1. Go to S3 Console → Storage Lens
2. Create dashboard with storage class analysis
3. Monitor transition trends

## Retrieval Considerations

### GLACIER Retrieval Costs

- Expedited: $0.03/GB + $0.01 per request (1-5 minutes)
- Standard: $0.01/GB + $0.05 per 1,000 requests (3-5 hours)
- Bulk: $0.0025/GB + $0.025 per 1,000 requests (5-12 hours)

### DEEP_ARCHIVE Retrieval Costs

- Standard: $0.02/GB + $0.10 per 1,000 requests (12 hours)
- Bulk: $0.0025/GB + $0.025 per 1,000 requests (48 hours)

**Best Practice**: Keep last 30 days in STANDARD or STANDARD_IA for instant access

## Automated Policy Application Script

```bash
#!/bin/bash
# File: apply-s3-lifecycle-policies.sh

POLICY_DIR="/home/user/summit/terraform/templates/s3-lifecycle-policies"

echo "Applying S3 lifecycle policies..."

# Backups
for bucket in $(aws s3 ls | awk '{print $3}' | grep -E 'backup|bak'); do
  echo "Applying backups policy to $bucket..."
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$bucket" \
    --lifecycle-configuration "file://$POLICY_DIR/backups-lifecycle.json"
done

# Logs
for bucket in $(aws s3 ls | awk '{print $3}' | grep -E 'log|logs'); do
  echo "Applying logs policy to $bucket..."
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$bucket" \
    --lifecycle-configuration "file://$POLICY_DIR/logs-lifecycle.json"
done

# Artifacts
for bucket in $(aws s3 ls | awk '{print $3}' | grep -E 'artifact|build|ci'); do
  echo "Applying artifacts policy to $bucket..."
  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$bucket" \
    --lifecycle-configuration "file://$POLICY_DIR/artifacts-lifecycle.json"
done

echo "Done!"
```

## Compliance Considerations

### Legal Hold Requirements

If your backups have legal/compliance requirements:
1. Adjust retention periods in the policy
2. Add `ObjectLockConfiguration` for immutable backups
3. Document retention justification

### Example: 7-Year Retention

```json
{
  "Rules": [
    {
      "Id": "compliance-backup-policy",
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"},
        {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

## Troubleshooting

### Issue: Objects not transitioning

**Cause**: Minimum object size requirements
- STANDARD_IA: 128KB minimum
- GLACIER: 0KB minimum (but 90-day minimum charge)

**Solution**: Add filter for object size
```json
"Filter": {
  "And": {
    "ObjectSizeGreaterThan": 128000
  }
}
```

### Issue: Unexpected costs after transition

**Cause**: GLACIER has minimum 90-day storage charge

**Solution**: Only transition objects you'll keep >90 days

## References

- [S3 Storage Classes Pricing](https://aws.amazon.com/s3/pricing/)
- [S3 Lifecycle Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Cost Optimization Review](/home/user/summit/docs/cloud-cost-optimization-review.md)

---

**Last Updated**: 2025-11-20
