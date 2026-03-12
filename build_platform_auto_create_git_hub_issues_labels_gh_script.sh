#!/usr/bin/env bash
# build-platform-bootstrap.sh
# Purpose: Create labels, milestone, and issues for the next-phase remediation
# Requires: GitHub CLI (gh) authenticated; repo set as current directory.
# Usage: ./build-platform-bootstrap.sh <milestone> [assignee]
set -euo pipefail

MILESTONE=${1:-"Build Platform — Next Phase"}
ASSIGNEE=${2:-""}

label() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || gh label edit "$name" --color "$color" --description "$desc"
}

issue() {
  local title="$1" body_file="$2" labels="$3"
  if [[ -n "$ASSIGNEE" ]]; then
    gh issue create --title "$title" --milestone "$MILESTONE" --assignee "$ASSIGNEE" --label "$labels" --body-file "$body_file"
  else
    gh issue create --title "$title" --milestone "$MILESTONE" --label "$labels" --body-file "$body_file"
  fi
}

# 1) Labels
label "build-platform" "0e8a16" "Build/CI/CD platform work"
label "policy" "5319e7" "Policy & supply-chain enforcement"
label "security" "b60205" "Security hardening"
label "performance" "1d76db" "Perf budgets & canaries"
label "terraform" "6f42c1" "IaC and Terraform"
label "observability" "0052cc" "Metrics, traces, logs"
label "next-phase" "c2e0c6" "This sprint next-phase scope"

# 2) Milestone
if ! gh milestone list --limit 200 | grep -q "$MILESTONE"; then
  gh milestone create "$MILESTONE" --description "Next-phase build platform remediation and policy hardening"
fi

# 3) Issue bodies (heredoc to temp files)
TMPDIR=$(mktemp -d)

cat >"$TMPDIR/issue-A1.md" <<'MD'
**Why**
Faster, targeted signal and reduced CI time by only typechecking changed packages.

**What**
- Add CI job: `turbo run typecheck --filter=...[origin/main] --since`
- Persist logs as artifacts

**Acceptance Criteria**
- PRs with TS errors fail
- Unchanged packages are skipped

**Verification**
- Seed PR with a TS error → fails; fix → passes
MD

cat >"$TMPDIR/issue-A2.md" <<'MD'
**Why**
Prevent test regressions; raise baseline quality.

**What**
- Configure Jest thresholds: lines≥80, branches≥75
- Upload coverage report artifacts

**Acceptance Criteria**
- CI fails when below thresholds

**Verification**
- Seed PR missing tests → red; add tests → green
MD

cat >"$TMPDIR/issue-B1.md" <<'MD'
**Why**
Eliminate mutable image tags and enforce digest-only deployments.

**What**
- Add `tools/policy/check-helm-digests.js`
- CI workflow to run policy on PRs touching charts
- Optional OPA/Rego rule `policy/helm_digest.rego`

**Acceptance Criteria**
- CI fails when `image.tag` non-empty or `image.digest` missing

**Verification**
- Seed PR with `tag: latest` → red; fix → green
MD

cat >"$TMPDIR/issue-B2.md" <<'MD'
**Why**
Keep dependencies current and reduce CVEs.

**What**
- Dependabot/Renovate for pnpm, pip, docker, github-actions
- Group dev-deps; hold prod deps for review

**Acceptance Criteria**
- Weekly PRs open; SBOM refresh runs
MD

cat >"$TMPDIR/issue-D1.md" <<'MD'
**Why**
Protect Terraform state and catch misconfigs early.

**What**
- S3 backend: versioning + SSE-KMS; DynamoDB lock table
- Add tfsec + checkov + `terraform validate` on PR

**Acceptance Criteria**
- PR plan runs; policy violations block merge
MD

cat >"$TMPDIR/issue-E1.md" <<'MD'
**Why**
Prevent frontend perf regressions.

**What**
- Lighthouse CI with budgets: perf≥0.80; LCP≤2.5s; total bytes≤450KB

**Acceptance Criteria**
- PR fails on budget breach
MD

cat >"$TMPDIR/issue-F1.md" <<'MD'
**Why**
Complete rollout of container hardening.

**What**
- Convert 4 more Python services: non-root, distroless, `--require-hashes`
- Trivy pass + SBOM attach

**Acceptance Criteria**
- Services run as non-root; 0 HIGH/CRIT (or documented exceptions)
MD

# 4) Create issues
issue "CI: Smart typecheck on changed packages" "$TMPDIR/issue-A1.md" "build-platform,next-phase"
issue "CI: Coverage thresholds & artifact upload" "$TMPDIR/issue-A2.md" "build-platform,next-phase"
issue "Policy: Helm digest enforcement (no mutable tags)" "$TMPDIR/issue-B1.md" "policy,security,next-phase"
issue "Bots: Dependabot/Renovate for pnpm/pip/docker/actions" "$TMPDIR/issue-B2.md" "build-platform,security,next-phase"
issue "Terraform: Backend hardening + tfsec/checkov" "$TMPDIR/issue-D1.md" "terraform,security,next-phase"
issue "FE: Lighthouse CI budgets on PR previews" "$TMPDIR/issue-E1.md" "performance,build-platform,next-phase"
issue "Containers: Harden 4 Python services (non-root, distroless)" "$TMPDIR/issue-F1.md" "security,build-platform,next-phase"

echo "✅ Created labels, milestone, and issues for '$MILESTONE'"