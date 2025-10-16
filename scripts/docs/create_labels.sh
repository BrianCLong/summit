#!/usr/bin/env bash
set -euo pipefail

# Create GitHub labels used by docs action extraction.
# Requires: GitHub CLI (gh) authenticated with repo access and jq installed.
# Usage: optionally set GITHUB_REPO=owner/repo; otherwise auto-detect via gh or git remote.

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) not found. Install gh and authenticate (gh auth login)." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found. Please install jq." >&2
  exit 1
fi

REPO="${GITHUB_REPO:-}"
if [[ -z "$REPO" ]]; then
  set +e
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
  if [[ -z "$REPO" ]]; then
    origin_url=$(git remote get-url origin 2>/dev/null || true)
    if [[ "$origin_url" =~ github.com[:/]{1}([^/]+/[^/.]+) ]]; then
      REPO="${BASH_REMATCH[1]}"
    fi
  fi
  set -e
fi
if [[ -z "$REPO" ]]; then
  echo "Could not determine repository owner/name. Set GITHUB_REPO=owner/repo." >&2
  exit 1
fi

echo "Ensuring labels in $REPO ..."

create_label() {
  local name="$1"; shift
  local color="$1"; shift
  local desc="$*"
  # Create if missing; update otherwise
  if ! gh label list --repo "$REPO" --limit 1000 --json name | jq -r '.[].name' | grep -Fxq "$name"; then
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" || true
  else
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc" || true
  fi
}

# Core labels for docs actions
create_label "from-docs" "0E8A16" "Created from documentation action extraction"
create_label "type:doc-action" "5319E7" "Action item originating from docs"
create_label "triage-needed" "B60205" "Needs triage/owner"

# Areas
create_label "area:security" "BFD4F2" "Security-related documentation/action"
create_label "area:release" "C2E0C6" "Release-related documentation/action"
create_label "area:runbook" "F9D0C4" "Runbook-related documentation/action"
create_label "area:operations" "E99695" "Operations-related documentation/action"
create_label "area:product" "FAD8C7" "Product/PRD/spec-related documentation/action"
create_label "area:planning" "F9D0C4" "Planning/roadmap/sprint-related documentation/action"
create_label "area:report" "D4C5F9" "Report/summary/validation/perf-related documentation/action"
create_label "area:architecture" "0052CC" "Architecture/standards-related documentation/action"
create_label "area:research" "5319E7" "Research/market/strategy-related documentation/action"

echo "Labels ensured in $REPO"
