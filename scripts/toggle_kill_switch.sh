#!/bin/bash
set -e

# Wrapper script to toggle kill switches
# Usage: ./scripts/toggle_kill_switch.sh <module> <on|off|status>

MODULE=$1
ACTION=$2

if [ -z "$MODULE" ] || [ -z "$ACTION" ]; then
    echo "Usage: $0 <module> <on|off|status>"
    exit 1
fi

CMD=""
if [ "$ACTION" == "on" ]; then
    CMD="activate"
elif [ "$ACTION" == "off" ]; then
    CMD="deactivate"
elif [ "$ACTION" == "status" ]; then
    CMD="status"
else
    echo "Invalid action: $ACTION. Use on, off, or status."
    exit 1
fi

# EXPLICIT PATH CONVERGENCE
# We assume the script is run from repo root.
# We set KILL_SWITCH_FILE to the absolute path of server/opa/data/kill-switches.json
export KILL_SWITCH_FILE="$(pwd)/server/opa/data/kill-switches.json"

# Ensure directory exists
mkdir -p "$(dirname "$KILL_SWITCH_FILE")"

# Execute the CLI using tsx
# We run from server/ directory to ensure module resolution works, but pass the env var.
cd server
npx tsx src/scripts/kill-switch-cli.ts $CMD $MODULE
