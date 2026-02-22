#!/usr/bin/env bash
set -euo pipefail

REQ="${1:-}"
if [[ -z "$REQ" ]]; then echo "usage: $0 <pnpm-version>" >&2; exit 2; fi
LOCKFILE="pnpm-lock.yaml"
if [[ ! -f "$LOCKFILE" ]]; then echo "No $LOCKFILE present; cannot verify." >&2; exit 1; fi

LFV=$(grep -E "^lockfileVersion:" "$LOCKFILE" | awk '{print $2}' | tr -d "'" | cut -d. -f1)
if [[ -z "$LFV" ]]; then echo "Could not determine lockfileVersion from $LOCKFILE" >&2; exit 1; fi

MAJOR=$(echo "$REQ" | cut -d. -f1)
case "$MAJOR" in
  8) [[ "$LFV" =~ ^(6|9)$ ]] ;;
  9) [[ "$LFV" == "9" ]] ;;
  *) echo "Unknown pnpm major $MAJOR; update compatibility map." >&2; exit 1 ;;
esac

echo "Lockfile v$LFV is compatible with pnpm $REQ."
