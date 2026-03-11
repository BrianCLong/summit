#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$DIR/../.." >/dev/null 2>&1 && pwd)"

LEDGER_DIR="$REPO_ROOT/security-ledger"
SCHEMA="$REPO_ROOT/schemas/governance/security-ledger.schema.json"

if [ ! -d "$LEDGER_DIR" ]; then
  echo "Security ledger directory not found: $LEDGER_DIR"
  exit 1
fi

if [ ! -f "$SCHEMA" ]; then
  echo "Schema not found: $SCHEMA"
  exit 1
fi

shopt -s nullglob
FILES=("$LEDGER_DIR"/*.json)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No ledger entries found in $LEDGER_DIR. Skipping validation."
  exit 0
fi

FAILED=0

echo "Validating ${#FILES[@]} ledger entries..."

for FILE in "${FILES[@]}"; do
  if python3 -m jsonschema -i "$FILE" "$SCHEMA"; then
    echo "✅ Valid: $(basename "$FILE")"
  else
    echo "❌ Invalid: $(basename "$FILE")"
    FAILED=1
  fi
done

if [ $FAILED -ne 0 ]; then
  echo "Validation failed for one or more ledger entries."
  exit 1
fi

echo "All ledger entries validated successfully."
exit 0
