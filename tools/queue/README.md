# Omnibus Merge Queue

Automation to merge open PRs into a single integration branch in waves, latest-first, with per-PR checks.

## Requirements
- GitHub CLI (`gh`) authenticated for this repo
- `jq`
- Node 18.x + npm 10.x
- Optional: `opa` (OPA CLI) if you have `policy/`, `helm` if you have `deploy/helm`

## Quick Start
```bash
export OMNI="merge/omnibus-$(date +%Y%m%d)"

# 1) Build waves (latest-first)
bash tools/queue/enumerate.sh

# 2) Create integration branch from main
git fetch origin --prune && git checkout -B "$OMNI" origin/main

# 3) Merge all PRs in order (stops on conflict)
OMNI="$OMNI" bash tools/queue/merge-wave.sh

# 4) After manual conflict resolution, continue
git add -A && git commit -m "Resolve conflicts per policy"
npm ci && npm run lint && npm run build && npm test --workspaces --if-present
git push -u origin "$OMNI"

# 5) Open PR to main when green
gh pr create --base main --head "$OMNI" \
  --title "Omnibus Merge: latest-first" \
  --body "All PRs merged with conflict policy; CI is green."
```

## Notes
- Waves are written to `/tmp/waves.tsv` as `wave<TAB>PR` and processed in ascending wave order.
- The merge loop runs lint/build/tests after each merge and pushes the branch frequently (small blast radius).
- OPA/Helm checks are best-effort locally and are required in CI if corresponding folders exist.

