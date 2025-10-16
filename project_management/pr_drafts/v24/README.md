This folder contains ready-to-paste **PR description drafts** plus shared sections you can embed or link.

## Drafts

- **PR-01-runtime-unification-node20.md** — Unify Node.js toolchain on v20
- **PR-02-runtime-unification-python312.md** — Unify Python toolchain on 3.12
- **PR-03-otel-coverage-tier1.md** — Expand OpenTelemetry coverage (Tier 1 services)
- **PR-04-pipeline-slo-migration-canary.md** — Migrate pipeline SLOs via canary
- **PR-05-release-train-slo-reusable.md** — Reusable release-train SLO workflows
- **PR-06-canary-default-helm.md** — Helm chart: canary-by-default toggles
- **PR-07-migration-gate.md** — Schema/Data migration gate wiring
- **PR-08-opa-policy-enforcement.md** — OPA policy enforcement guardrails
- **PR-09-ci-hygiene-speed.md** — CI hygiene + speedups
- **PR-10-v24-modules-containerize-chart.md** — Containerize v24 modules & chart updates

Shared: [`SHARED-SECTIONS.md`](./SHARED-SECTIONS.md) (risk, rollback, evidence).

### How to use

1. Open any draft in your editor, tweak details, then paste into `gh pr create --fill` UI **or** use the helper script below to publish all.
2. If linking to shared sections, keep the relative link. If you prefer a single self‑contained PR body, use `--embed-shared` in the script.

---

# scripts/pr-drafts/publish-prs.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# Publish multiple PRs from markdown drafts with optional shared sections.
# Requires: gh CLI, git remote pointing to GitHub.

usage() {
  cat <<USAGE
Usage: $0 [-d drafts_dir] [-B base] [-H head] [--ready|--draft] \
          [--labels "l1,l2"] [--milestone M] [--embed-shared] [--repo owner/repo] [--dry-run]

Defaults:
  -d project_management/pr_drafts/v24
  -B main (fallback if not a branch)
  -H current branch (git rev-parse --abbrev-ref HEAD)
  --draft by default

Examples:
  $0 --labels "v24,platform" --milestone "v24" --embed-shared
  $0 -B main -H feature/runtime-unify --ready --labels "runtime,node"
USAGE
}

DIR=${1:-}
BASE="main"
HEAD="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
DRAFT_FLAG="--draft"
LABELS=""
MILESTONE=""
EMBED_SHARED=0
REPO=""
DRY_RUN=0

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir) DIR="$2"; shift 2 ;;
    -B|--base) BASE="$2"; shift 2 ;;
    -H|--head) HEAD="$2"; shift 2 ;;
    --ready) DRAFT_FLAG=""; shift ;;
    --draft) DRAFT_FLAG="--draft"; shift ;;
    --labels) LABELS="$2"; shift 2 ;;
    --milestone) MILESTONE="$2"; shift 2 ;;
    --embed-shared) EMBED_SHARED=1; shift ;;
    --repo) REPO="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) shift ;;
  esac
done

if [[ -z "$DIR" ]]; then DIR="project_management/pr_drafts/v24"; fi
if [[ -z "$REPO" ]]; then
  # try to infer from git
  url=$(git config --get remote.origin.url || true)
  if [[ "$url" =~ github.com[/:]([^/]+)/([^/.]+) ]]; then
    REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
fi

if ! command -v gh >/dev/null; then echo "❌ gh CLI not found"; exit 1; fi

mapfile -t FILES < <(ls -1 "$DIR"/PR-*.md 2>/dev/null | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then echo "❌ No PR drafts in $DIR"; exit 1; fi

SHARED="$DIR/SHARED-SECTIONS.md"

for f in "${FILES[@]}"; do
  [[ $(basename "$f") == "SHARED-SECTIONS.md" ]] && continue
  title=$(grep -m1 '^# ' "$f" | sed 's/^# \s*//')
  if [[ -z "$title" ]]; then title=$(basename "$f" .md | sed 's/PR-[0-9]*-//; s/-/ /g'); fi

  tmp=$(mktemp)
  if [[ $EMBED_SHARED -eq 1 && -f "$SHARED" ]]; then
    # Append shared sections if not already linked
    if ! grep -q "SHARED-SECTIONS.md" "$f"; then
      { cat "$f"; echo -e "\n---\n"; cat "$SHARED"; } > "$tmp"
    else
      cat "$f" > "$tmp"
    fi
  else
    cat "$f" > "$tmp"
  fi

  args=(pr create --title "$title" --body-file "$tmp" --base "$BASE" --head "$HEAD")
  if [[ -n "$DRAFT_FLAG" ]]; then args+=("$DRAFT_FLAG"); fi
  IFS=',' read -ra LARR <<< "$LABELS"
  for l in "${LARR[@]}"; do [[ -n "$l" ]] && args+=(--label "$l"); done
  [[ -n "$MILESTONE" ]] && args+=(--milestone "$MILESTONE")
  [[ -n "$REPO" ]] && args+=(--repo "$REPO")

  echo "\n📝 Creating PR from: $f"
  echo "   Title: $title"
  echo "   Base: $BASE  Head: $HEAD  Repo: ${REPO:-current}  Draft: ${DRAFT_FLAG:+yes}${DRAFT_FLAG:+'no'}"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "   (dry-run) gh ${args[*]}"
  else
    gh "${args[@]}"
  fi
  rm -f "$tmp"

done

echo "✅ Done."
```

---

# scripts/pr-drafts/open-drafts.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
DIR="${1:-project_management/pr_drafts/v24}"
EDITOR_CMD="${EDITOR:-}"; [[ -z "$EDITOR_CMD" ]] && EDITOR_CMD="${VISUAL:-}"; [[ -z "$EDITOR_CMD" ]] && EDITOR_CMD="vi"

shopt -s nullglob
for f in "$DIR"/PR-*.md; do
  [[ $(basename "$f") == "SHARED-SECTIONS.md" ]] && continue
  echo "Opening $f"
  "$EDITOR_CMD" "$f"
 done
```

---

# Example usage

```bash
# Open drafts for edits
bash scripts/pr-drafts/open-drafts.sh

# Publish as draft PRs to main from current branch, embed shared sections, label and milestone
bash scripts/pr-drafts/publish-prs.sh \
  --embed-shared \
  --labels "v24,platform" \
  --milestone "v24"

# Ready-for-review PRs with explicit base/head and repo
bash scripts/pr-drafts/publish-prs.sh \
  -B main -H feature/v24-rollout \
  --ready --repo my-org/my-repo --labels "runtime,otel"

# Dry-run to see commands only
bash scripts/pr-drafts/publish-prs.sh --dry-run
```
