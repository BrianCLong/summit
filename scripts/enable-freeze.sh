#!/bin/bash
set -e

LOCK_FILE="CHANGE_FREEZE_ACTIVE"

if [ -f "$LOCK_FILE" ]; then
    echo "Change freeze is ALREADY ACTIVE."
    echo "Reason: $(cat $LOCK_FILE)"
    exit 0
fi

REASON=${1:-"Emergency Incident Response"}

echo "$REASON" > "$LOCK_FILE"
echo "Ref: $(git rev-parse HEAD)" >> "$LOCK_FILE"
echo "Date: $(date)" >> "$LOCK_FILE"

echo "❄️  CHANGE FREEZE ENABLED ❄️"
echo "Reason: $REASON"
echo "All non-critical deployments should be halted."
echo "To check status: ./scripts/check-freeze.sh"
