# Evidence Immutability Setup with S3 Object Lock

This document outlines the configuration for evidence immutability using AWS S3 Object Lock to ensure tamper-proof storage of audit logs, provenance data, and security evidence.

## Overview

Evidence immutability is implemented using:

- **AWS S3 Object Lock in Governance Mode** with 90-day default retention
- **Versioning enabled** for complete audit trail
- **SSE-KMS encryption** with Customer Managed Keys (CMK)
- **Optional MFA Delete** for enhanced security
- **Lifecycle policies** for cost optimization

## S3 Bucket Configuration

### 1. Create Evidence Bucket with Object Lock

```bash
# Create bucket with object lock enabled
aws s3api create-bucket \
    --bucket maestro-evidence-bucket \
    --region us-east-1 \
    --object-lock-enabled-for-bucket

# Configure default object lock settings
aws s3api put-object-lock-configuration \
    --bucket maestro-evidence-bucket \
    --object-lock-configuration '{
        "ObjectLockEnabled": "Enabled",
        "Rule": {
            "DefaultRetention": {
                "Mode": "GOVERNANCE",
                "Days": 90
            }
        }
    }'

# Enable versioning (required for object lock)
aws s3api put-bucket-versioning \
    --bucket maestro-evidence-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA Delete (optional but recommended)
aws s3api put-bucket-versioning \
    --bucket maestro-evidence-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::ACCOUNT-ID:mfa/root-account-mfa-device XXXXXX"
```

### 2. Configure SSE-KMS Encryption

```bash
# Create KMS key for evidence encryption
aws kms create-key \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Enable IAM policies",
                "Effect": "Allow",
                "Principal": {"AWS": "arn:aws:iam::ACCOUNT-ID:root"},
                "Action": "kms:*",
                "Resource": "*"
            },
            {
                "Sid": "Allow evidence service access",
                "Effect": "Allow",
                "Principal": {"AWS": "arn:aws:iam::ACCOUNT-ID:role/maestro-evidence-writer"},
                "Action": [
                    "kms:Encrypt",
                    "kms:Decrypt",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*",
                    "kms:DescribeKey"
                ],
                "Resource": "*"
            }
        ]
    }' \
    --description "Maestro Evidence Encryption Key"

# Apply bucket encryption
aws s3api put-bucket-encryption \
    --bucket maestro-evidence-bucket \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms",
                    "KMSMasterKeyID": "arn:aws:kms:us-east-1:ACCOUNT-ID:key/KEY-ID"
                },
                "BucketKeyEnabled": true
            }
        ]
    }'
```

### 3. Apply Bucket Policy

Apply the bucket policy from `aws-s3-object-lock-policy.json`:

```bash
aws s3api put-bucket-policy \
    --bucket maestro-evidence-bucket \
    --policy file://aws-s3-object-lock-policy.json
```

## Evidence Upload Implementation

### Backend Service Integration

```javascript
// Evidence storage service
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

class EvidenceService {
  async storeEvidence(runId, nodeId, evidence) {
    const key = `runs/${runId}/nodes/${nodeId}/evidence-${Date.now()}.json`;
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + 90); // 90 days

    try {
      const result = await s3
        .putObject({
          Bucket: "maestro-evidence-bucket",
          Key: key,
          Body: JSON.stringify(evidence),
          ObjectLockMode: "GOVERNANCE",
          ObjectLockRetainUntilDate: retentionDate,
          ServerSideEncryption: "aws:kms",
          SSEKMSKeyId: process.env.EVIDENCE_KMS_KEY_ID,
          Metadata: {
            "run-id": runId,
            "node-id": nodeId,
            "evidence-type": evidence.type,
            "created-at": new Date().toISOString(),
          },
        })
        .promise();

      return {
        success: true,
        key,
        versionId: result.VersionId,
        etag: result.ETag,
        retentionUntil: retentionDate.toISOString(),
      };
    } catch (error) {
      console.error("Failed to store evidence:", error);
      throw new Error("Evidence storage failed: " + error.message);
    }
  }

  async retrieveEvidence(key, versionId = null) {
    try {
      const params = {
        Bucket: "maestro-evidence-bucket",
        Key: key,
      };

      if (versionId) {
        params.VersionId = versionId;
      }

      const result = await s3.getObject(params).promise();

      return {
        data: JSON.parse(result.Body.toString()),
        metadata: result.Metadata,
        versionId: result.VersionId,
        lastModified: result.LastModified,
        objectLockMode: result.ObjectLockMode,
        objectLockRetainUntilDate: result.ObjectLockRetainUntilDate,
      };
    } catch (error) {
      console.error("Failed to retrieve evidence:", error);
      throw new Error("Evidence retrieval failed: " + error.message);
    }
  }

  async verifyIntegrity(key, expectedHash) {
    try {
      const evidence = await this.retrieveEvidence(key);
      const actualHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(evidence.data))
        .digest("hex");

      return {
        valid: actualHash === expectedHash,
        expectedHash,
        actualHash,
        key,
        versionId: evidence.versionId,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        key,
      };
    }
  }
}
```

## Evidence Integrity Verification

### CLI Tool for Verification

```bash
#!/bin/bash
# evidence-verify.sh - Verify evidence integrity

BUCKET="maestro-evidence-bucket"
KEY="$1"
EXPECTED_HASH="$2"

if [ -z "$KEY" ] || [ -z "$EXPECTED_HASH" ]; then
    echo "Usage: $0 <evidence-key> <expected-hash>"
    exit 1
fi

# Download and verify
TEMP_FILE="/tmp/evidence-${RANDOM}.json"
aws s3api get-object --bucket "$BUCKET" --key "$KEY" "$TEMP_FILE"

# Calculate hash
ACTUAL_HASH=$(sha256sum "$TEMP_FILE" | cut -d' ' -f1)

# Clean up
rm "$TEMP_FILE"

# Compare
if [ "$ACTUAL_HASH" = "$EXPECTED_HASH" ]; then
    echo "✅ Evidence integrity verified"
    echo "Key: $KEY"
    echo "Hash: $ACTUAL_HASH"

    # Check object lock status
    aws s3api get-object-retention --bucket "$BUCKET" --key "$KEY" 2>/dev/null || echo "No retention policy found"
    exit 0
else
    echo "❌ Evidence integrity check FAILED"
    echo "Key: $KEY"
    echo "Expected: $EXPECTED_HASH"
    echo "Actual: $ACTUAL_HASH"
    exit 1
fi
```

## Testing Evidence Immutability

### Test Script: Attempt Unauthorized Deletion

```bash
#!/bin/bash
# test-evidence-immutability.sh

BUCKET="maestro-evidence-bucket"
TEST_KEY="test/evidence-immutability-test-$(date +%s).json"

echo "Testing evidence immutability..."

# Upload test evidence
echo '{"test": "evidence", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /tmp/test-evidence.json

aws s3api put-object \
    --bucket "$BUCKET" \
    --key "$TEST_KEY" \
    --body /tmp/test-evidence.json \
    --object-lock-mode GOVERNANCE \
    --object-lock-retain-until-date "$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Evidence uploaded: $TEST_KEY"

# Attempt to delete (should fail)
echo "Attempting unauthorized deletion..."
if aws s3api delete-object --bucket "$BUCKET" --key "$TEST_KEY" 2>/dev/null; then
    echo "❌ SECURITY ISSUE: Deletion succeeded when it should have failed!"
    exit 1
else
    echo "✅ Deletion properly denied by Object Lock"
fi

# Attempt to overwrite (should fail)
echo "Attempting unauthorized overwrite..."
if aws s3api put-object --bucket "$BUCKET" --key "$TEST_KEY" --body /tmp/test-evidence.json 2>/dev/null; then
    echo "❌ SECURITY ISSUE: Overwrite succeeded when it should have failed!"
    exit 1
else
    echo "✅ Overwrite properly denied by Object Lock"
fi

echo "✅ Evidence immutability test passed"
rm /tmp/test-evidence.json
```

## Lifecycle Management

### Configure Lifecycle for Cost Optimization

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket maestro-evidence-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "EvidenceLifecycle",
                "Status": "Enabled",
                "Filter": {"Prefix": "runs/"},
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 90,
                        "StorageClass": "GLACIER"
                    },
                    {
                        "Days": 365,
                        "StorageClass": "DEEP_ARCHIVE"
                    }
                ],
                "NoncurrentVersionTransitions": [
                    {
                        "NoncurrentDays": 30,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "NoncurrentDays": 90,
                        "StorageClass": "GLACIER"
                    }
                ]
            }
        ]
    }'
```

## Monitoring and Alerting

### CloudWatch Alarms

```bash
# Alert on bucket access
aws cloudwatch put-metric-alarm \
    --alarm-name "MaestroEvidenceBucketAccess" \
    --alarm-description "Alert on evidence bucket access" \
    --metric-name NumberOfObjects \
    --namespace AWS/S3 \
    --statistic Sum \
    --period 3600 \
    --threshold 1000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=BucketName,Value=maestro-evidence-bucket \
    --evaluation-periods 1

# Alert on failed deletions
aws logs put-metric-filter \
    --log-group-name /aws/s3/maestro-evidence-bucket \
    --filter-name "FailedDeletions" \
    --filter-pattern "[timestamp, request_id, ip, requester, operation=DELETE, key, request_uri, http_status=4*, error_code, bytes_sent, object_size, total_time, turnaround_time, referrer, user_agent, version_id]" \
    --metric-transformations \
        metricName=FailedDeletions,metricNamespace=Maestro/Evidence,metricValue=1
```

## Evidence Integration in Frontend

```typescript
// Evidence viewer component with immutability verification
import React from 'react';

interface EvidenceViewerProps {
  runId: string;
  nodeId?: string;
}

const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ runId, nodeId }) => {
  const [evidence, setEvidence] = useState(null);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const response = await fetch(`/api/maestro/v1/runs/${runId}/evidence${nodeId ? `?nodeId=${nodeId}` : ''}`);
        const data = await response.json();
        setEvidence(data);

        // Verify integrity
        const verifyResponse = await fetch(`/api/maestro/v1/runs/${runId}/evidence/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: data.key, hash: data.expectedHash })
        });
        const verifyData = await verifyResponse.json();
        setVerification(verifyData);
      } catch (error) {
        console.error('Failed to load evidence:', error);
      }
    };

    fetchEvidence();
  }, [runId, nodeId]);

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Evidence & Provenance</h3>
        {verification && (
          <div className={`px-2 py-1 rounded text-xs ${
            verification.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {verification.valid ? '✅ Integrity Verified' : '❌ Integrity Check Failed'}
          </div>
        )}
      </div>

      {evidence && (
        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded font-mono text-xs">
            <div><strong>S3 Key:</strong> {evidence.key}</div>
            <div><strong>Version ID:</strong> {evidence.versionId}</div>
            <div><strong>Retention Until:</strong> {evidence.retentionUntil}</div>
            <div><strong>SHA-256:</strong> {evidence.hash}</div>
          </div>

          <div className="text-sm text-slate-600">
            <p><strong>🔒 Immutability:</strong> This evidence is protected by AWS S3 Object Lock and cannot be deleted or modified until {new Date(evidence.retentionUntil).toLocaleDateString()}.</p>
            <p><strong>🔐 Encryption:</strong> Encrypted at rest with AWS KMS Customer Managed Key.</p>
            <p><strong>📝 Versioning:</strong> All versions are retained for complete audit trail.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
```

## Compliance and Audit

### Evidence Collection Report

The evidence immutability system maintains:

1. **Tamper-proof storage** - Object Lock prevents deletion/modification during retention period
2. **Complete audit trail** - S3 versioning captures all changes
3. **Encryption at rest** - KMS CMK encryption with key rotation
4. **Access logging** - CloudTrail integration for all bucket operations
5. **Integrity verification** - SHA-256 checksums for all evidence files
6. **Retention enforcement** - Configurable retention periods with legal hold support

### Evidence Types Stored

- Run execution logs and metrics
- Node-level artifacts and outputs
- Supply chain attestations (SBOM, SLSA, Cosign signatures)
- Policy decisions and explanations
- Audit events and access logs
- Performance metrics and traces
- Security scan results
- Configuration snapshots

This implementation ensures that all critical evidence in Maestro is stored in a tamper-proof, immutable format that meets enterprise security and compliance requirements.
