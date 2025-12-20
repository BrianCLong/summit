#!/bin/bash
# File: scripts/cloud-cost/ebs-orphaned-volumes.sh
# Description: Find unattached EBS volumes and old snapshots

echo "=== Unattached EBS Volumes ==="
echo ""

# Find volumes with status 'available' (not attached)
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId, Size, VolumeType, CreateTime]' \
  --output table

echo ""
echo "=== Cost Estimate for Unattached Volumes ==="

TOTAL_SIZE=$(aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'sum(Volumes[*].Size)' \
  --output text)

# gp3 pricing: $0.08/GB-month
MONTHLY_COST=$(echo "scale=2; $TOTAL_SIZE * 0.08" | bc)

echo "Total Size: ${TOTAL_SIZE} GB"
echo "Estimated Monthly Cost: \$$MONTHLY_COST"
echo ""

echo "=== Old EBS Snapshots (>90 days) ==="
echo ""

NINETY_DAYS_AGO=$(date -d '90 days ago' +%Y-%m-%d 2>/dev/null || date -v-90d +%Y-%m-%d)

aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<'${NINETY_DAYS_AGO}'].[SnapshotId, VolumeSize, StartTime, Description]" \
  --output table

echo ""
echo "=== Recommendations ==="
echo "- Delete unattached volumes after 7 days (unless tagged for retention)"
echo "- Implement automated snapshot lifecycle using AWS Data Lifecycle Manager"
echo "- Migrate gp2 volumes to gp3 for 20% cost savings"
