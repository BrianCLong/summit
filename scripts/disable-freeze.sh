#!/bin/bash
set -e

LOCK_FILE="CHANGE_FREEZE_ACTIVE"

if [ ! -f "$LOCK_FILE" ]; then
    echo "No change freeze is currently active."
    exit 0
fi

rm "$LOCK_FILE"

echo "☀️  CHANGE FREEZE DISABLED ☀️"
echo "Normal deployment operations may resume."
