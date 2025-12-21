#!/usr/bin/env bash
set -euo pipefail
COMMAND=${1:-help}
AUDIT_FILE="tools/security/support-mode/audit.log"
case "$COMMAND" in
  issue-token)
    TENANT=${2:?tenant required}
    EXPIRY=${3:?expiry required}
    echo "{\"tenant\":\"$TENANT\",\"expires\":\"$EXPIRY\",\"issued_at\":\"$(date -Iseconds)\"}" > tools/security/support-mode/token.json
    echo "issued token for $TENANT expires $EXPIRY" >> "$AUDIT_FILE"
    ;;
  audit)
    cat "$AUDIT_FILE"
    ;;
  *)
    echo "Usage: cli.sh issue-token <tenant> <expiry>|audit"
    ;;
esac
