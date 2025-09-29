#!/usr/bin/env bash
set -euo pipefail

# Minimal label sync for status/area/type labels using GitHub CLI.
# Env: REPO_SLUG=owner/repo (defaults to current gh repo)

REPO_SLUG=${REPO_SLUG:-}

upsert_label() {
  local name="$1" color="$2" desc="$3"
  if [[ -n "$REPO_SLUG" ]]; then
    gh api repos/$REPO_SLUG/labels --method POST -f name="$name" -f color="$color" -f description="$desc" >/dev/null 2>&1 || \
    gh api repos/$REPO_SLUG/labels/"$(echo "$name" | sed 's/ /%20/g')" --method PATCH -f color="$color" -f description="$desc" >/dev/null
  else
    gh api repos/:owner/:repo/labels --method POST -f name="$name" -f color="$color" -f description="$desc" >/dev/null 2>&1 || \
    gh api repos/:owner/:repo/labels/"$(echo "$name" | sed 's/ /%20/g')" --method PATCH -f color="$color" -f description="$desc" >/dev/null
  fi
  echo "✔ $name"
}

echo "Syncing status/area/type labels..."

# Status
upsert_label "status: now" 0e8a16 "Currently in progress (Now)"
upsert_label "status: next" fbca04 "Up next in queue (Next)"
upsert_label "status: later" bfdadc "Later / backlog (Later)"

# Areas
upsert_label "area: ops" 0052cc ""
upsert_label "area: observability" 1d76db ""
upsert_label "area: security" d93f0b ""
upsert_label "area: data" 5319e7 ""
upsert_label "area: auth" c2e0c6 ""
upsert_label "area: er" 0e8a16 ""
upsert_label "area: cost" fbca04 ""
upsert_label "area: supply-chain" bfdadc ""

# Types
upsert_label "type: runbook" 5319e7 ""
upsert_label "type: alert" d93f0b ""
upsert_label "type: k6" 1d76db ""
upsert_label "type: chaos" 0052cc ""

echo "Done."

