# Scoped CI PR Runbook Card

This card documents the day-one operator flow for opening scoped CI pull requests. It packages the go-order script, verification
steps, and reusable workflow references so any engineer can bootstrap MSTC, TRR, and OPA lanes in minutes.

## 0. Automation helper (optional but recommended)

Run the helper script to execute the same sanitized flow with consistent logging and guardrails:

```bash
bash scripts/open_scoped_prs.sh --initial --verify
```

Add `--all` to fan out to every local branch that diverges from `origin/main`, or `--help` to see the available flags. The
script handles sanitize, rebase, push, PR creation, and post-run verification.

## 1. Fast path to open the first wave (MSTC, TRR, OPA)

```bash
# start clean
git fetch --all --prune

# branches to open first
for BR in feat/mstc feat/trr feat/opa; do
  git checkout "$BR" || continue

  # sanitize diffs so PRs never include binaries/large files
  bash scripts/pr_sanitize.sh || true

  # rebase and push safely
  git fetch origin
  git rebase origin/main

  # push with lease and open PR with scoped title/labels
  git push --force-with-lease -u origin "$BR"

  gh pr create \
    --title "[$(echo "$BR" | cut -d/ -f2- | tr '[:lower:]' '[:upper:]')] Scoped CI: ready for review" \
    --body-file docs/pr-runbook-card.md \
    --label "ci:scoped","ready-for-ci" \
    --base main \
    --head "$BR" || true
done
```

### Guardrails that keep the loop safe
- `scripts/pr_sanitize.sh` removes transient build output, fails on binaries >5 MB, and surfaces whitespace issues.
- `.github/workflows/pr-sanitize-guard.yml` blocks large/binary assets server-side in CI with the same policy.
- `docs/REGENERATE_ARTIFACTS.md` explains how to keep artifacts reproducible when the guard fires.

## 2. Validate that the scoped lanes fired

After opening the PRs, confirm that the path filters and reusable workflows registered:

```bash
gh run list --limit 10 --workflow ci.pr.mstc.yml
gh run list --limit 10 --workflow ci.pr.trr.yml
gh run list --limit 10 --workflow ci.pr.opa.yml
gh run view --job detect-paths --log
```

The detect-paths logs include the matched files JSON payload so reviewers can confirm the scope without digging into the diff.

## 3. Fan out to every active branch automatically

```bash
# Open PRs for every local branch that differs from origin/main
for BR in $(git for-each-ref --format='%(refname:short)' refs/heads | grep -v '^main$'); do
  git checkout "$BR" || continue

  # Skip if no diff vs main
  git fetch origin
  if git diff --quiet "origin/main"...HEAD; then
    echo "⏭️  $BR has no meaningful diff vs main"; continue
  fi

  # Sanitize => rebase => push => PR
  bash scripts/pr_sanitize.sh || true
  git rebase origin/main || { echo "⚠️  rebase conflict on $BR, leaving for manual fix"; continue; }
  git push --force-with-lease -u origin "$BR"
  gh pr create \
    --title "[$BR] Ready for scoped CI" \
    --body "Auto-opened via PR sanitize flow. See docs/pr-runbook-card.md for lanes & smoke." \
    --label "ready-for-ci" \
    --base main --head "$BR" || true
done
```

This script relies on the reusable scoped workflows described below. Branches that do not touch scoped paths still run the
baseline secrets/policy gate and emit a ✅ summary so reviewers know the guardrails executed.

## 4. Reusable workflow template

Drop-in template for new scopes:

```yaml
# .github/workflows/ci.pr.<SHORT>.yml
name: ci.pr.<SHORT>
on:
  pull_request:
    paths:
      - '<ROOT-PATH>/**'
      - '.github/**'
jobs:
  use-reusable:
    uses: ./.github/workflows/ci.scoped-reusable.yml
    with:
      filter_name: "<SHORT>"
      include_globs: |
        <ROOT-PATH>/**
      exclude_globs: |
        **/*.snap
        **/*.png
        **/*.jpg
        neo4j/data/**
      node_version: "20"
      preflight_vitest: true
      preflight_paths: |
        <ROOT-PATH>
      setup_cmd: |
        corepack enable || true
        pnpm install --frozen-lockfile || npm ci
      lint_cmd: |
        pnpm -C <ROOT-PATH> lint || npm --prefix <ROOT-PATH> run lint
      test_cmd: |
        pnpm -C <ROOT-PATH> test -- --run || npm --prefix <ROOT-PATH> test -- --run
```

## 5. Quick-add helper

The `Makefile` includes a helper target for new scoped callers:

```bash
make add-caller NAME=pkg-new ROOT=packages/new-pkg
make add-caller NAME=mc-orch ROOT=services/mc-orchestration
```

Each invocation scaffolds `.github/workflows/ci.pr.<NAME>.yml` with the template above.

## 6. When a branch refuses to open a PR

1. Run `bash scripts/pr_sanitize.sh` and re-commit without binaries.
2. If Git rejects the push because of historical large blobs, run the generated `scripts/purge-large-files.sh` on a scratch
   clone, force-push with lease, and re-create the branch.

With these pieces in place the scoped CI system delivers deterministic, low-noise PRs from the first run onward.
