#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:-BrianCLong}"
ROOT="bonus_projects/seed"

for F in "$ROOT"/*.json; do
  NAME=$(jq -r '.name' "$F")
  VIS=$(jq -r '.visibility // "PRIVATE"' "$F")
  echo "Seeding: $NAME"

  # Create project if missing
  if gh project list --owner "$OWNER" --format json | jq -r '.[].title' | grep -qx "$NAME"; then
    echo "  ✅ Already exists"
  else
    if [ "$VIS" = "PUBLIC" ]; then
      gh project create --owner "$OWNER" --title "$NAME" --public
    else
      gh project create --owner "$OWNER" --title "$NAME"
    fi
    echo "  ✅ Created"
  fi
done

echo ""
echo "✅ All 9 bonus projects created"
echo "Next: Run 'make bonus-apply' to add custom fields and sample items"
