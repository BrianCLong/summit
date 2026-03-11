# PR Backlog Recovery Playbook (Unrelated Histories + Missing LFS Objects)

## Executive status

- **Integrated:** 37 approved pull requests merged successfully.
- **Blocked:** ~100 approved pull requests require manual owner intervention.
- **Primary blockers:**
  1. `fatal: refusing to merge unrelated histories`
  2. Missing Git LFS objects required by legacy branches

This playbook is the governed recovery path for the remaining backlog and aligns remediation work to the current mainline authority in the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Outcome contract for golden main

The objective is deterministic backlog reduction while preserving repository integrity:

1. Classify all blocked PR refs into recovery lanes.
2. Recover each PR through a lane-specific salvage workflow.
3. Reopen recovered work as clean PRs against current `main`.
4. Gate every recovered PR through the standard quality suite before merge.

No branch bypasses `main`; every recovery is replayed into present-day governance and CI rules.

## Triage lanes (authoritative)

Classify each blocked PR into one lane before touching code:

1. **Lane A — Unrelated history only**
   - Branch has recoverable source content, no missing LFS blobs.
   - Recovery action: `cherry-pick` or manual file port onto latest `main`.
2. **Lane B — Missing LFS objects only**
   - Branch ancestry is valid, but checkout/test/push fails because `.gitattributes`-tracked objects are absent.
   - Recovery action: recover blobs from contributor fork, release artifacts, or archival packs.
3. **Lane C — Dual failure (history + LFS)**
   - Requires both content replay and object recovery.

## Fast classification automation

Use the repository helper to classify refs before owner assignment:

```bash
node scripts/pr-backlog-audit.mjs \
  --base origin/main \
  --input /tmp/pr-backlog-refs.txt \
  --output artifacts/pr-backlog-audit.json
```

Input file format: one branch or ref per line, comments allowed via `#`.

The script emits lane counts and per-ref lane assignment to accelerate owner routing.

## Owner runbook (manual recovery)

### 1) Prepare an isolated salvage branch

```bash
git checkout main
git pull origin main
git checkout -b salvage/<pr-number>-<short-name>
```

### 2) Recover code when histories are unrelated

Prefer commit-level replay over force-merging divergent graphs:

```bash
# Add contributor remote if needed
git remote add contributor <fork-url>
git fetch contributor <branch>

# Inspect commits to port
git log --oneline contributor/<branch>

# Replay commits one at a time
git cherry-pick <commit-sha>
```

If replay is too noisy, manually port changed files and create new commits preserving intent.

### 3) Recover missing LFS objects

```bash
# Verify LFS setup
git lfs install

# Identify missing objects
git lfs fsck

# Attempt retrieval from known remotes
git lfs fetch --all origin
git lfs fetch --all contributor
```

If objects remain missing, recover from one of:

- Original author local clone (preferred)
- Prior CI artifacts/releases containing exact object hashes
- Team archival storage containing historic LFS packs

After object restoration:

```bash
git lfs pull
git lfs fsck
```

### 4) Validate before PR reopen

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
make smoke
```

### 5) Reopen as a fresh PR

Open a new PR from the salvage branch to `main` with:

- Link to original blocked PR
- Recovery lane (A/B/C)
- Evidence of LFS integrity check
- Rollback note (revert commit set)
- Change classification label (`patch`/`minor`/`major`)

## Governance outputs required for each recovered PR

Every recovered PR must include:

- Decision rationale: why salvage was needed now
- Confidence score with basis
- Rollback trigger and rollback steps
- Post-merge accountability window and watch metrics
- Tradeoff ledger entry when cost/risk/velocity changes

## Repository maintainer actions (central)

1. Publish one **LFS object escrow bundle** for known missing object hashes.
2. Publish a **rewrite map** (`old_sha -> new_sha` where known) to reduce manual archaeology.
3. Add CI preflight to classify incoming PRs into lanes A/B/C and block unsafe auto-merge attempts.

## Final disposition policy

If a PR cannot be reconstructed due to irrecoverable data loss, mark as:

- **Deferred pending object recovery**, or
- **Closed as superseded by reauthored PR `<new-pr-id>`**.

This keeps the backlog finite, auditable, and convergent toward a clean and green golden main.
