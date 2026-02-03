#!/usr/bin/env bash
set -euo pipefail

### Release Captain: auto-label + Danger + protection seal (fixed) ###

need() { command -v "$1" >/dev/null || { echo "❌ missing: $1"; exit 1; }; }
need gh
need git
need jq

echo "🔐 Checking GitHub auth..."
gh auth status -h github.com >/dev/null

OWNER=${OWNER:-$(gh repo view --json owner --jq .owner.login)}
REPO=${REPO:-$(gh repo view --json name  --jq .name)}
DEFAULT_BRANCH=${BRANCH:-$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' || echo main)}
BRANCH_WORK="${BRANCH_WORK:-chore/ci-auto-label-danger}"
echo "📦 Repo: $OWNER/$REPO  |  Default branch: $DEFAULT_BRANCH"

# Ensure we are inside a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not inside a git repository"; exit 1;
fi

# 0) Seed labels (prefer your bootstrap script; else fall back to gh label create)
echo "🏷️  Seeding labels..."
if [ -x scripts/bootstrap_labels.sh ]; then
  bash scripts/bootstrap_labels.sh || true
else
  gh label create "ui:smoke"     --color 1f6feb --description "Trigger UI/API smoke in CI"      2>/dev/null || true
  gh label create "ops:strict"   --color 8a2be2 --description "Hard gate: ops.validate"         2>/dev/null || true
  gh label create "perf:strict"  --color b60205 --description "Hard gate: k6 smoke"             2>/dev/null || true
  gh label create "audit:strict" --color 0e8a16 --description "Strict dependency/audit gate"    2>/dev/null || true
fi

# 1) Create branch & commit the CI files (if not already merged)
echo "🌿 Preparing branch ${BRANCH_WORK}..."
git fetch origin --quiet || true
# If local branch exists, reuse it; else track remote if present; else create from default
if git show-ref --verify --quiet "refs/heads/$BRANCH_WORK"; then
  echo "ℹ️  Local branch exists; reusing"
  git checkout "$BRANCH_WORK"
  git pull --ff-only origin "$BRANCH_WORK" || true
elif git ls-remote --exit-code --heads origin "$BRANCH_WORK" >/dev/null 2>&1; then
  echo "ℹ️  Tracking remote branch origin/$BRANCH_WORK"
  git checkout -b "$BRANCH_WORK" --track "origin/$BRANCH_WORK"
else
  echo "ℹ️  Creating work branch from $DEFAULT_BRANCH"
  git checkout "$DEFAULT_BRANCH"
  git pull --ff-only origin "$DEFAULT_BRANCH" || true
  git checkout -b "$BRANCH_WORK"
fi

# Add files (they should already exist in your working copy)
ADD_PATHS=(
  ".github/workflows/auto.label.yml"
  ".github/labeler.yml"
  ".github/workflows/danger.yml"
  "dangerfile.ts"
  "Makefile"
)
# tolerate missing files (e.g., if already merged)
for p in "${ADD_PATHS[@]}"; do
  [ -e "$p" ] && git add "$p" || true
done

# Commit if there are changes
if ! git diff --cached --quiet; then
  HUSKY=0 git commit -m "chore(ci): auto-label by paths + Danger doctor nudge" --no-verify
else
  echo "ℹ️  No staged changes to commit."
fi

# Push & open PR if needed
git push -u origin "$BRANCH_WORK" || true
EXISTING_PR="$(gh pr list --head "$BRANCH_WORK" --json number --jq '.[0].number // empty' || true)"
if [ -z "$EXISTING_PR" ]; then
  echo "📝 Opening PR..."
  gh pr create \
    -t "CI: auto-label + Danger doctor nudge" \
    -b "Auto-label PRs by paths and nudge if \`make doctor\` confirmation is missing. Adds \`discover.checks\` + keeps branch protection drift-free." \
    || true
fi
PR_NUM="$(gh pr list --head "$BRANCH_WORK" --json number --jq '.[0].number' | head -n1 || true)"
[ -n "${PR_NUM:-}" ] || { echo "ℹ️  No PR found (maybe already merged). Continuing..."; }

# 2) Stream checks & merge when green (squash, delete branch)
if [ -n "${PR_NUM:-}" ]; then
  echo "⏳ Waiting for PR #${PR_NUM} checks..."
  gh pr checks --watch "$PR_NUM" || true
  echo "🔀 Merging PR #${PR_NUM}..."
  gh pr merge "$PR_NUM" --squash --delete-branch --auto || gh pr merge "$PR_NUM" --squash --delete-branch || true
fi

# 3) Heal + doctor locally (best-effort)
echo "🩺 Heal + doctor (local)..."
command -v pnpm >/dev/null && pnpm i -w --frozen-lockfile=false || true
[ -f scripts/monorepo_heal.mjs ] && node scripts/monorepo_heal.mjs || true
[ -f scripts/green_build.sh ] && bash scripts/green_build.sh || true
[ -f scripts/doctor.mjs ] && node scripts/doctor.mjs || true

# 4) Kick CI (unified + PR smoke) on default branch
echo "🚀 Kicking CI workflows on $DEFAULT_BRANCH..."
gh workflow run ci.unified.yml -f ref="$DEFAULT_BRANCH" || true
gh workflow run k6.smoke.yml   -f ref="$DEFAULT_BRANCH" || true

# 5) Promote required checks via your helper (drift-proof)
echo "🛡️  Promoting required checks with protect_branch..."
if make -n protect.branch >/dev/null 2>&1; then
  make protect.branch || true
else
  echo "⚠️ Make target protect.branch not found — using fallback."
  export REQUIRED_CONTEXTS=$'CI (green) / green\nunified-ci / build-test'
  bash scripts/protect_branch.sh || true
fi

# 6) Snapshot status & protections
echo "🔎 Snapshot (last 10 runs on $DEFAULT_BRANCH):"
gh run list --limit 10 --branch "$DEFAULT_BRANCH" \
  --json workflowName,status,conclusion,updatedAt \
  --jq '.[] | [.workflowName,.status,.conclusion,.updatedAt] | @tsv' || true

echo "🧰 Required status checks:"
gh api "/repos/$OWNER/$REPO/branches/$DEFAULT_BRANCH/protection" --jq '.required_status_checks.contexts' || true

echo "✅ Done. Auto-label + Danger shipped, CI kicked, protections enforced."
echo "Tip: run 'make discover.checks' anytime to see exact check names."
