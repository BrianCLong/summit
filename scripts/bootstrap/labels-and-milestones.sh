#!/usr/bin/env bash
set -euo pipefail
# Ensure labels and milestones exist. Requires: gh CLI auth with repo:admin
# Usage:
#   scripts/bootstrap/labels-and-milestones.sh <owner/repo> \
#     --labels v24:#0e8a16 v25:#5319e7 platform:#0366d6 \
#     --milestones v24:2025-10-31 v25:2026-01-31

usage(){
  echo "Usage: $0 <owner/repo> [--labels name:#RRGGBB ...] [--milestones name:YYYY-MM-DD ...]" >&2
}

REPO=${1:-}; shift || true
[[ -z "${REPO}" ]] && usage && exit 1

LABELS=()
MSTONES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --labels) shift; while [[ $# -gt 0 && $1 != --milestones ]]; do LABELS+=("$1"); shift; done ;; 
    --milestones) shift; while [[ $# -gt 0 ]]; do [[ $1 == --* ]] && break; MSTONES+=("$1"); shift; done ;; 
    *) echo "Unknown arg: $1" >&2; exit 1 ;; 
  esac
done

IFS='/' read -r OWNER NAME <<< "$REPO"

# Labels
for l in "${LABELS[@]:-}"; do
  [[ -z "$l" ]] && continue
  name=${l%%:*}; color=${l#*:};
  echo "→ ensuring label $name ($color)"
  if gh api repos/$REPO/labels/$name >/dev/null 2>&1; then
    gh api -X PATCH repos/$REPO/labels/$name -f color=${color//#/}
  else
    gh api -X POST repos/$REPO/labels -f name="$name" -f color=${color//#/} -f description="bootstrap"
  fi
  echo "✓ $name"

done

# Milestones
for m in "${MSTONES[@]:-}"; do
  [[ -z "$m" ]] && continue
  title=${m%%:*}; due=${m#*:}; 
  echo "→ ensuring milestone $title (due $due)"
  id=$(gh api repos/$REPO/milestones --jq ".[] | select(.title==\"$title\") | .number" || true)
  if [[ -n "$id" ]]; then
    gh api -X PATCH repos/$REPO/milestones/$id -f title="$title" -f due_on="${due}T00:00:00Z"
  else
    gh api -X POST repos/$REPO/milestones -f title="$title" -f due_on="${due}T00:00:00Z"
  fi
  echo "✓ $title"

done

echo "All set."
