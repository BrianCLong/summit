# Merge Queue Playbook

Purpose: Keep `main` green with low churn by merging through a controlled, observable queue with strict gates and fast rollback.

## Roles
- Merge Captain: orchestrates batches, requeues PRs, triggers rollbacks, posts reports.
- Code Owners: review domain changes; approve/deny; own migration gating notes.
- CI Maintainers: keep runners stable; own Node/pinning, concurrency, and nightly jobs.

## Queue Sizing & Policy
- Batch size: start 1; increase to 2 after first fully green batch. If red, drop back to 1.
- Required checks: build, unit, e2e, security (CodeQL/SAST/SCA), SBOM (no criticals).
- Concurrency: per-ref cancellation on CI to avoid duplicate runs.

CI reference:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Per‑PR Prep (mechanical)
1) Update branch to latest `origin/main` (GitHub “Update branch” or API).
2) Engines: Node 18.20.4; Jest runs in-band. Regenerate lockfile if needed under Node 18.
3) Security: ensure CodeQL/SAST/SCA pass with no critical findings; SBOM is emitted.
4) Migrations: must be gated, include up/down parity and rollback notes; disabled by default.
5) Flakies: quarantine per `docs/qa/flaky-tests.md`; open a follow-up issue.

Helpers:
```bash
# Re-update a PR from base
gh api -X PUT -H 'Accept: application/vnd.github+json' \
  repos/$OWNER/$REPO/pulls/<PR>/update-branch

# Re-enable auto-merge / add to queue
gh pr merge <PR> --auto --merge
```

## Batch Order (guide)
1) Low risk (docs/infra-only)
2) Isolated features
3) Platform features
4) New services
5) Heavier/riskier platform
6) Cross‑cutting controls (cost/limits)
7) Release line (hotfix-only deltas)

If two branches conflict repeatedly, create `merge-train/<YYYY-MM-DD>`, reconcile once, push fixups back to each PR, then requeue.

## Nightly Integration (Docker)
- Workflow: `.github/workflows/integration-nightly.yml` (Node 18.20.4, `DOCKER_AVAILABLE=1`).
- Runs docker-compose stack (if present), executes `npm run test:integration` (fallback to `jest --runInBand`), uploads artifacts.
- Does not affect the merge queue CI (keeps queue fast and quiet).

## SBOM
- Ensure CycloneDX SBOM is produced in CI or security workflow; upload artifact for audit.

## Requeue Procedure
Run after CI engine pin or main CI changes to apply to all queued PRs.
```bash
bash scripts/requeue_after_ci_pin.sh
```
What it does: update branches from base, re-enable auto-merge, and allow the queue to schedule under the current CI environment.

## Rollback Protocol (deterministic)
1) If `main` turns red, immediately revert the last merge (GitHub UI).
2) Pause queue; open a fix PR with root-cause notes.
3) Resume queue after fix lands and `main` is green.

## Reporting (end of train)
- MERGE REPORT: PR → title → risk → prep commits → conflicts → security cleared → checks green → method → merge SHA → notes.
- WHAT CHANGED: highlights (user-visible), tech changes (deps/migrations gated), security/compliance notes, ops/runbooks touched.
- FOLLOW‑UPS: links to flakies/quarantines, migration enablement, queue tuning.
- AUDIT LINKS: main CI runs, SBOM artifact(s), merge queue summary, any reverts.

