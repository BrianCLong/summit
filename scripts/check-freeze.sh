#!/bin/bash

LOCK_FILE="CHANGE_FREEZE_ACTIVE"

# Check for Override Environment Variables
if [ "${CHANGE_FREEZE_OVERRIDE}" == "true" ]; then
    echo "⚠️  CHANGE FREEZE OVERRIDDEN"
    echo "Reason: ${CHANGE_FREEZE_REASON:-"No reason provided"}"
    exit 0
fi

if [ -f "$LOCK_FILE" ]; then
    echo "❌ CHANGE FREEZE IS ACTIVE"
    echo "--------------------------"
    cat "$LOCK_FILE"
    echo "--------------------------"
    echo "Deployments are blocked unless override is provided."
    echo "To override, export CHANGE_FREEZE_OVERRIDE=true and CHANGE_FREEZE_REASON='Reason'"
    exit 1
else
    echo "✅ No change freeze active. Proceed."
    exit 0
fi
