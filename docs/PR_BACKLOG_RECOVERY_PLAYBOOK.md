# PR Backlog Recovery Playbook (Unrelated Histories + Missing LFS Objects)

## Executive status

- **Integrated:** 37 approved pull requests merged successfully.
- **Blocked:** ~100 approved pull requests require manual owner intervention.
- **Primary blockers:**
  1. `fatal: refusing to merge unrelated histories`
  2. missing Git LFS objects required by legacy branches

This playbook is the governing recovery path for the remaining backlog and aligns remediation work to the current mainline authority set in the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Why automated merge lanes stop here

The remaining branches are not just in conflict with current `main`; they are often rooted in pre-rewrite commit ancestry. Standard merge automation cannot synthesize missing parent history or restore absent LFS blobs without an authoritative source.

## Triage taxonomy

Classify each blocked PR into one lane before touching code:

1. **Lane A — Unrelated history only**
   - Branch has code, no missing blobs.
   - Recovery action: `cherry-pick`/manual port onto latest `main`.
2. **Lane B — Missing LFS objects only**
   - Branch ancestry is valid, but push/test fails due to absent `.gitattributes`-tracked blobs.
   - Recovery action: recover blobs from author fork, release artifact, or archival bundle.
3. **Lane C — Dual failure (history + LFS)**
   - Requires both content porting and object recovery.

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

- Original author's local clone (best source)
- Prior CI artifacts/releases containing the exact file hash
- Team-managed archival storage of LFS packs

After object restoration:

```bash
git lfs pull
git lfs fsck
```

### 4) Validate before PR reopen

```bash
pnpm lint
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

## Governance requirements for recovered PRs

Every recovered PR must include:

- Decision rationale: why salvage was needed now
- Confidence score and basis
- Rollback trigger and rollback steps
- Post-merge accountability window and watch metrics
- Tradeoff ledger entry if cost/risk profile changed

## Repository maintainer actions (central)

1. Publish a single **LFS object escrow bundle** for known-missing object hashes.
2. Publish a **rewrite map** (old SHA -> new SHA when known) to reduce manual archaeology.
3. Add a CI preflight that classifies incoming PRs into lanes A/B/C and blocks unsafe auto-merge attempts.

## Final disposition policy

If a PR cannot be reconstructed due to irrecoverable data loss, mark as:

- **Deferred pending object recovery**, or
- **Closed as superseded by reauthored PR `<new-pr-id>`**.

This closes ambiguity while keeping the merge backlog finite and auditable.
