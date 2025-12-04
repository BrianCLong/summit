# Merge Queue Automation Package

This guide captures the merge automation playbook, reusable prompt, and the `gh`-powered script for safely merging labeled pull requests with dependency-aware ordering, conflict handling, optional branch sweeping, and prerelease tagging.

## High-level plan

1. Gate merges on green checks, branch protections, and required reviews.
2. Merge only PRs labeled `ready-to-merge` or `automerge` (opt-in, avoids landmines).
3. Auto-queue by dependency (detect `Depends on #123` chains).
4. For failing or conflicted PRs, relabel and comment with next actions.
5. (Optional) Sweep stray branches: open PRs automatically if they’re ahead of the default branch.
6. Cut a release once the queue clears and generate notes.

## Drop-in “Codex Developer” prompt

> **Role:** You are a senior release engineer for the `BrianCLong/intelgraph` repo.
> **Goal:** Safely merge all eligible PRs and reconcile branches with minimal risk and full auditability.
>
> **Hard rules:**
>
> * Default branch is `${DEFAULT_BRANCH:=main}`; read it from the repo and don’t assume.
> * Only merge PRs with labels in `{ready-to-merge, automerge}` and with passing required checks & required reviews.
> * Respect branch protection and required status checks. Never force-push to protected branches.
> * Prefer **merge queue** (if enabled) else sequential merges; strategy: `--merge` (no squash) to preserve authored commits.
> * If a PR body contains lines like `Depends on #<id>`, topologically sort so dependencies merge first.
> * If checks fail or merge conflicts exist, add labels `{blocked/ci}` or `{blocked/conflict}`, post a helpful comment, and skip.
> * For non-PR branches ahead of default by >0 commits, open draft PRs titled `Branch sweep: <branch>` (unless branch matches ignore globs: `release/*`, `wip/*`, `archive/*`).
> * After merges complete, trigger CI on default branch, then cut a prerelease tag `v0.0.0-merge-<YYYYMMDD-HHMM>` with generated notes.
> * Everything must be idempotent and support `DRY_RUN=1`. Log every action.
>
> **Deliverables:**
>
> 1. A Bash script using `gh` that performs the above (POSIX-sh compatible, `set -euo pipefail`).
> 2. Minimal README snippet with usage and rollback tips.
> 3. A sample run (dry-run) transcript.
>
> **Quality bar:** Clear logs, robust error handling, no hard-coded repo, safe by default, works on macOS/Linux with `gh` v2.0+.

## Script: `scripts/merge-all.sh`

The script is safe-by-default (`DRY_RUN=1`) and auto-discovers the repository owner/name from `gh` unless overridden via `OWNER`/`REPO`. It enforces label gates, performs dependency-aware ordering, labels and comments on blocked/conflicted PRs, optionally sweeps stray branches, and can create a prerelease tag with generated notes.

### Usage

```bash
# dry-run (default)
./scripts/merge-all.sh

# actually execute
DRY_RUN=0 OWNER=BrianCLong REPO=intelgraph ./scripts/merge-all.sh

# also sweep stray branches into draft PRs and skip tagging
DRY_RUN=0 SWEEP_BRANCHES=1 CUT_RELEASE=0 ./scripts/merge-all.sh
```

### Sample dry-run transcript

```
Default branch: main
Eligible PR candidates: 3
Planned merge order: 42 57 63
PR #42 is draft; skipping
PR #57 blocked by checks/reviews. Labeling.
[DRY_RUN] gh pr edit -R BrianCLong/intelgraph 57 --add-label blocked/ci
Planned merge order: 42 57 63
PR #63 has conflicts. Labeling + comment.
[DRY_RUN] gh pr edit -R BrianCLong/intelgraph 63 --add-label blocked/conflict
[DRY_RUN] gh pr comment -R BrianCLong/intelgraph 63 --body 'Merge conflict detected. Please rebase on `main`.'
Creating prerelease v0.0.0-merge-20250101-1200…
[DRY_RUN] gh release create v0.0.0-merge-20250101-1200 --repo BrianCLong/intelgraph --prerelease --notes "<generated>"
Done.
```

### Rollback tips

- To revert a bad merge on the default branch:
  ```bash
  git pull origin "$(git rev-parse --abbrev-ref HEAD)"
  git log --oneline   # find the merge SHA
  git revert -m 1 <merge_sha>
  git push origin HEAD
  ```
- If a PR branch was auto-deleted, restore via GitHub UI → Branches → “Restore” or `git push origin <sha>:refs/heads/<branch>`.

## Next steps

- Enable GitHub **merge queue** on the default branch (Branch protection → “Require merge queue”) to maximize throughput safely.
- Add a repo rule to require label `ready-to-merge` for merges.
- Add workflows to auto-label `blocked/ci` when checks fail.
