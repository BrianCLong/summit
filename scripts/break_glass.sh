#!/bin/bash
set -e

# Break-Glass Script
# Usage: ./scripts/break_glass.sh --user <username> --reason <reason>

USER=""
REASON=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --user) USER="$2"; shift ;;
        --reason) REASON="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$USER" ] || [ -z "$REASON" ]; then
    echo "Usage: ./scripts/break_glass.sh --user <username> --reason <reason>"
    exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_ENTRY="[$TIMESTAMP] BREAK_GLASS_ACTIVATED User=$USER Reason=$REASON"

# Create audit directory if it doesn't exist
mkdir -p audit

# Write to audit log
echo "$LOG_ENTRY" >> audit/break_glass.log

# Create the marker file
echo "$LOG_ENTRY" > .break_glass

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "WARNING: BREAK-GLASS PROTOCOL ACTIVATED"
echo "All safety gates are now compromised."
echo "This action has been logged and reported."
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
