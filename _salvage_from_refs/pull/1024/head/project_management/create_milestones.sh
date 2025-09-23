#!/usr/bin/env bash
# Usage: OWNER=yourorg REPO=yourrepo ./create_milestones.sh
set -euo pipefail

: "${OWNER:?Set OWNER}" 
: "${REPO:?Set REPO}" 

while IFS= read -r title; do
  [ -z "$title" ] && continue
  echo "Creating milestone: $title"
  gh api --method POST \
    "/repos/$OWNER/$REPO/milestones" \
    -f title="$title" \
    -f state=open >/dev/null
done < project_management/milestones.txt

echo "Done."

