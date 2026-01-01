#!/bin/bash

LOCK_FILE="CHANGE_FREEZE_ACTIVE"

if [ -f "$LOCK_FILE" ]; then
    echo "❌ CHANGE FREEZE IS ACTIVE"
    echo "--------------------------"
    cat "$LOCK_FILE"
    echo "--------------------------"
    echo "Deployments are blocked unless override is provided."
    exit 1
else
    echo "✅ No change freeze active. Proceed."
    exit 0
fi
