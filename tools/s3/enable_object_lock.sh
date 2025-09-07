#!/usr/bin/env bash
set -euo pipefail

BUCKET=${1:?"bucket name required"}
aws s3api put-bucket-object-lock-configuration --bucket "$BUCKET"   --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": { "DefaultRetention": { "Mode": "COMPLIANCE", "Days": 365 } }
  }'

echo "Object Lock enabled in COMPLIANCE mode for 365 days on $BUCKET"
