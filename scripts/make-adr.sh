#!/usr/bin/env bash
set -euo pipefail

ID=$(printf "%04d" $(($(ls docs/adr/*.md 2>/dev/null | wc -l) + 1)))
TITLE=${1:-"new-decision"}
DATE=$(date +%F)
FILE="docs/adr/${ID}-${TITLE}.md"

cat > "$FILE" <<EOF2
# ${ID}: ${TITLE//-/ }

* Status: Draft
* Date: ${DATE}

## Context

## Decision

## Consequences
EOF2

echo "created $FILE"
