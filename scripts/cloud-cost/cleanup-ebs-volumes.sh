#!/bin/bash
# File: scripts/cloud-cost/cleanup-ebs-volumes.sh
# Description: Automated cleanup of unattached EBS volumes and old snapshots
# Estimated Savings: $10-30/month

set -euo pipefail

# Configuration
DRY_RUN=${DRY_RUN:-true}  # Set to false to actually delete resources
VOLUME_AGE_DAYS=${VOLUME_AGE_DAYS:-7}  # Delete volumes unattached for this many days
SNAPSHOT_AGE_DAYS=${SNAPSHOT_AGE_DAYS:-90}  # Delete snapshots older than this
REGION=${AWS_REGION:-us-east-1}
BACKUP_TAG_KEY="Backup"  # Don't delete resources with this tag
BACKUP_TAG_VALUE="Keep"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
echo "EBS Cleanup Automation Script"
echo "========================================="
echo "Region: $REGION"
echo "Dry Run: $DRY_RUN"
echo "Volume Age Threshold: $VOLUME_AGE_DAYS days"
echo "Snapshot Age Threshold: $SNAPSHOT_AGE_DAYS days"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    log_warn "Running in DRY RUN mode - no resources will be deleted"
    log_warn "Set DRY_RUN=false to actually delete resources"
    echo ""
fi

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install it first."
    exit 1
fi

# Check jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq not found. Please install it first."
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    log_error "AWS credentials not configured or invalid"
    exit 1
fi

# Calculate date threshold for volumes
VOLUME_THRESHOLD=$(date -d "$VOLUME_AGE_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${VOLUME_AGE_DAYS}d +%Y-%m-%d)
log_info "Volume threshold date: $VOLUME_THRESHOLD"

# Calculate date threshold for snapshots
SNAPSHOT_THRESHOLD=$(date -d "$SNAPSHOT_AGE_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${SNAPSHOT_AGE_DAYS}d +%Y-%m-%d)
log_info "Snapshot threshold date: $SNAPSHOT_THRESHOLD"
echo ""

#############################################
# PART 1: Cleanup Unattached EBS Volumes
#############################################

echo "========================================="
echo "PART 1: Unattached EBS Volumes"
echo "========================================="

log_info "Finding unattached volumes older than $VOLUME_AGE_DAYS days..."

# Get unattached volumes
UNATTACHED_VOLUMES=$(aws ec2 describe-volumes \
    --region "$REGION" \
    --filters Name=status,Values=available \
    --query "Volumes[?CreateTime<'${VOLUME_THRESHOLD}'].[VolumeId,Size,VolumeType,CreateTime,Tags[?Key=='Name'].Value|[0],Tags[?Key=='${BACKUP_TAG_KEY}'].Value|[0]]" \
    --output json)

VOLUME_COUNT=$(echo "$UNATTACHED_VOLUMES" | jq 'length')

if [ "$VOLUME_COUNT" -eq 0 ]; then
    log_info "No unattached volumes found older than $VOLUME_AGE_DAYS days"
else
    log_info "Found $VOLUME_COUNT unattached volumes"
    echo ""

    TOTAL_SIZE=0
    DELETED_COUNT=0
    SKIPPED_COUNT=0

    echo "$UNATTACHED_VOLUMES" | jq -c '.[]' | while read -r volume; do
        VOLUME_ID=$(echo "$volume" | jq -r '.[0]')
        SIZE=$(echo "$volume" | jq -r '.[1]')
        TYPE=$(echo "$volume" | jq -r '.[2]')
        CREATE_TIME=$(echo "$volume" | jq -r '.[3]')
        NAME=$(echo "$volume" | jq -r '.[4] // "N/A"')
        BACKUP_TAG=$(echo "$volume" | jq -r '.[5] // "null"')

        echo "---"
        echo "Volume ID: $VOLUME_ID"
        echo "Name: $NAME"
        echo "Size: ${SIZE}GB"
        echo "Type: $TYPE"
        echo "Created: $CREATE_TIME"

        # Check if volume has backup tag
        if [ "$BACKUP_TAG" = "$BACKUP_TAG_VALUE" ]; then
            log_warn "Skipping - has $BACKUP_TAG_KEY=$BACKUP_TAG_VALUE tag"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
            continue
        fi

        # Create snapshot before deletion (if not dry run)
        if [ "$DRY_RUN" = "false" ]; then
            log_info "Creating snapshot before deletion..."
            SNAPSHOT_ID=$(aws ec2 create-snapshot \
                --region "$REGION" \
                --volume-id "$VOLUME_ID" \
                --description "Snapshot before cleanup - Volume: $VOLUME_ID, Name: $NAME" \
                --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=cleanup-${VOLUME_ID}},{Key=AutomatedCleanup,Value=true},{Key=OriginalVolume,Value=${VOLUME_ID}}]" \
                --query 'SnapshotId' \
                --output text)
            log_info "Created snapshot: $SNAPSHOT_ID"

            # Delete the volume
            log_info "Deleting volume $VOLUME_ID..."
            if aws ec2 delete-volume --region "$REGION" --volume-id "$VOLUME_ID"; then
                log_info "Successfully deleted volume $VOLUME_ID"
                DELETED_COUNT=$((DELETED_COUNT + 1))
                TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
            else
                log_error "Failed to delete volume $VOLUME_ID"
            fi
        else
            log_info "[DRY RUN] Would create snapshot and delete this volume"
            TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        fi

        echo ""
    done

    echo "========================================="
    echo "Volume Cleanup Summary"
    echo "========================================="
    if [ "$DRY_RUN" = "true" ]; then
        echo "Volumes that would be deleted: $VOLUME_COUNT"
        echo "Volumes that would be skipped: $SKIPPED_COUNT"
        echo "Total size: ${TOTAL_SIZE}GB"
        MONTHLY_SAVINGS=$(echo "scale=2; $TOTAL_SIZE * 0.08" | bc)
        echo "Estimated monthly savings: \$${MONTHLY_SAVINGS}"
    else
        echo "Volumes deleted: $DELETED_COUNT"
        echo "Volumes skipped: $SKIPPED_COUNT"
        echo "Total size freed: ${TOTAL_SIZE}GB"
        MONTHLY_SAVINGS=$(echo "scale=2; $TOTAL_SIZE * 0.08" | bc)
        echo "Actual monthly savings: \$${MONTHLY_SAVINGS}"
    fi
    echo ""
fi

#############################################
# PART 2: Cleanup Old EBS Snapshots
#############################################

echo "========================================="
echo "PART 2: Old EBS Snapshots"
echo "========================================="

log_info "Finding snapshots older than $SNAPSHOT_AGE_DAYS days..."

# Get old snapshots owned by this account
OLD_SNAPSHOTS=$(aws ec2 describe-snapshots \
    --region "$REGION" \
    --owner-ids self \
    --query "Snapshots[?StartTime<'${SNAPSHOT_THRESHOLD}'].[SnapshotId,VolumeSize,StartTime,Description,Tags[?Key=='Name'].Value|[0],Tags[?Key=='${BACKUP_TAG_KEY}'].Value|[0]]" \
    --output json)

SNAPSHOT_COUNT=$(echo "$OLD_SNAPSHOTS" | jq 'length')

if [ "$SNAPSHOT_COUNT" -eq 0 ]; then
    log_info "No snapshots found older than $SNAPSHOT_AGE_DAYS days"
else
    log_info "Found $SNAPSHOT_COUNT old snapshots"
    echo ""

    TOTAL_SIZE=0
    DELETED_COUNT=0
    SKIPPED_COUNT=0

    echo "$OLD_SNAPSHOTS" | jq -c '.[]' | while read -r snapshot; do
        SNAPSHOT_ID=$(echo "$snapshot" | jq -r '.[0]')
        SIZE=$(echo "$snapshot" | jq -r '.[1]')
        START_TIME=$(echo "$snapshot" | jq -r '.[2]')
        DESCRIPTION=$(echo "$snapshot" | jq -r '.[3] // "N/A"')
        NAME=$(echo "$snapshot" | jq -r '.[4] // "N/A"')
        BACKUP_TAG=$(echo "$snapshot" | jq -r '.[5] // "null"')

        echo "---"
        echo "Snapshot ID: $SNAPSHOT_ID"
        echo "Name: $NAME"
        echo "Size: ${SIZE}GB"
        echo "Created: $START_TIME"
        echo "Description: $DESCRIPTION"

        # Check if snapshot has backup tag
        if [ "$BACKUP_TAG" = "$BACKUP_TAG_VALUE" ]; then
            log_warn "Skipping - has $BACKUP_TAG_KEY=$BACKUP_TAG_VALUE tag"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
            continue
        fi

        # Check if snapshot is being used by an AMI
        AMI_CHECK=$(aws ec2 describe-images \
            --region "$REGION" \
            --owners self \
            --filters "Name=block-device-mapping.snapshot-id,Values=$SNAPSHOT_ID" \
            --query 'Images[*].ImageId' \
            --output text)

        if [ -n "$AMI_CHECK" ]; then
            log_warn "Skipping - used by AMI: $AMI_CHECK"
            SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
            continue
        fi

        # Delete the snapshot
        if [ "$DRY_RUN" = "false" ]; then
            log_info "Deleting snapshot $SNAPSHOT_ID..."
            if aws ec2 delete-snapshot --region "$REGION" --snapshot-id "$SNAPSHOT_ID"; then
                log_info "Successfully deleted snapshot $SNAPSHOT_ID"
                DELETED_COUNT=$((DELETED_COUNT + 1))
                TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
            else
                log_error "Failed to delete snapshot $SNAPSHOT_ID"
            fi
        else
            log_info "[DRY RUN] Would delete this snapshot"
            TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        fi

        echo ""
    done

    echo "========================================="
    echo "Snapshot Cleanup Summary"
    echo "========================================="
    if [ "$DRY_RUN" = "true" ]; then
        echo "Snapshots that would be deleted: $SNAPSHOT_COUNT"
        echo "Snapshots that would be skipped: $SKIPPED_COUNT"
        echo "Total size: ${TOTAL_SIZE}GB"
        MONTHLY_SAVINGS=$(echo "scale=2; $TOTAL_SIZE * 0.05" | bc)
        echo "Estimated monthly savings: \$${MONTHLY_SAVINGS}"
    else
        echo "Snapshots deleted: $DELETED_COUNT"
        echo "Snapshots skipped: $SKIPPED_COUNT"
        echo "Total size freed: ${TOTAL_SIZE}GB"
        MONTHLY_SAVINGS=$(echo "scale=2; $TOTAL_SIZE * 0.05" | bc)
        echo "Actual monthly savings: \$${MONTHLY_SAVINGS}"
    fi
    echo ""
fi

echo "========================================="
echo "Cleanup Complete"
echo "========================================="

if [ "$DRY_RUN" = "true" ]; then
    echo ""
    log_warn "This was a dry run. To actually delete resources, run:"
    echo "  DRY_RUN=false $0"
    echo ""
    log_warn "To keep specific resources, tag them with:"
    echo "  Key: $BACKUP_TAG_KEY, Value: $BACKUP_TAG_VALUE"
fi

exit 0
