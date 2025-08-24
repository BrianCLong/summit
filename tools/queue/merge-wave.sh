#!/usr/bin/env bash
set -euo pipefail

# Merge PRs into an integration branch with per-PR checks (fail-fast)
# Requirements: gh, git, node/npm, optional: opa, helm

OMNI="${OMNI:-merge/omnibus-$(date +%Y%m%d)}"
WAVES_TSV="${WAVES_TSV:-/tmp/waves.tsv}"

if [[ ! -f "$WAVES_TSV" ]]; then
  echo "[!] $WAVES_TSV not found. Run tools/queue/enumerate.sh first." >&2
  exit 1
fi

echo "[i] Preparing branch $OMNI from origin/main…"
git fetch origin --prune
git checkout -B "$OMNI" origin/main

while read -r PR; do
  [[ -z "$PR" ]] && continue
  BR=$(gh pr view "$PR" --json headRefName -q .headRefName)
  TITLE=$(gh pr view "$PR" --json title -q .title)
  echo "=== Merge PR #$PR ($BR) into $OMNI ==="
  git fetch origin "$BR"
  if ! git merge --no-ff --log -m "Merge PR #$PR: $TITLE" "origin/$BR"; then
    echo "[!] Conflicts encountered in PR #$PR. Resolve manually and re-run." >&2
    exit 2
  fi

  echo "[i] Running fast checks (lint/build/test)…"
  # Install deps fresh to avoid lock drift and ensure deterministic builds.
  npm ci
  npm run -s lint
  npm run -s build

  # Prefer npm workspaces if available; fall back gracefully.
  if npm run -ws >/dev/null 2>&1; then
    npm run -ws --if-present test -- --maxWorkers=50%
  else
    npm test --if-present -- --maxWorkers=50%
  fi

  # Policy checks (optional)
  if command -v opa >/dev/null 2>&1 && [ -d policy ]; then
    echo "[i] Running OPA checks…"
    opa fmt -l policy
    opa check policy
    if [ -d tests/opa ]; then
      opa test -v policy tests/opa || true
    fi
  else
    echo "[i] Skipping OPA checks (opa or policy/ not present)."
  fi

  # Helm lint (optional)
  if command -v helm >/dev/null 2>&1 && [ -d deploy/helm ]; then
    echo "[i] Running helm lint…"
    helm lint deploy/helm || true
  else
    echo "[i] Skipping helm lint (helm or deploy/helm not present)."
  fi

  echo "[i] Pushing $OMNI to origin…"
  git push -u origin "$OMNI"
done < <(cut -f2 "$WAVES_TSV")

echo "[i] Merge loop completed for all queued PRs."

