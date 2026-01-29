# GA Release Dashboard

**Last Updated**: 2026-01-04T20:30:00Z
**Release Target**: v4.1.0 GA

## Status Heartbeat

```
MAIN_GREEN: NO
OPEN_PRS_TOTAL: 30+
GA_ELIGIBLE: 19
MERGED_TODAY: 0
DEFERRED: 3
TOP_BLOCKER: Integration tests failing on main (Jest root directory resolution)
NEXT_ACTION: Fix Jest config for CI then merge Bucket A PRs
```

---

## Release Map

### Build/Test Commands

| Action            | Command                          | Source       |
| ----------------- | -------------------------------- | ------------ |
| Install           | `pnpm install --frozen-lockfile` | package.json |
| Build             | `pnpm build`                     | package.json |
| Lint              | `pnpm lint`                      | package.json |
| Lint CJS          | `pnpm lint:cjs`                  | package.json |
| Typecheck         | `pnpm typecheck`                 | package.json |
| Unit Tests        | `pnpm test:unit`                 | package.json |
| Integration Tests | `pnpm test:integration`          | package.json |
| E2E               | `pnpm e2e`                       | package.json |
| Full CI           | `make ci`                        | Makefile     |
| GA Gate           | `make ga`                        | Makefile     |
| Preflight         | `make claude-preflight`          | Makefile     |

### Release Mechanism

- **Type**: semantic-release (automated)
- **Trigger**: Push to main with conventional commits
- **Plugins**: commit-analyzer, release-notes-generator, changelog, npm, git, github
- **Version**: SemVer (current: 4.0.4)

### Required CI Checks

| Check              | Workflow             | Status                      |
| ------------------ | -------------------- | --------------------------- |
| Lint               | ci.yml               | Required                    |
| Verification Suite | ci.yml               | Required                    |
| Test (unit)        | ci.yml               | Non-blocking (known issues) |
| Test (integration) | ci.yml               | Required - FAILING          |
| Golden Path        | ci.yml               | Required                    |
| GA Readiness       | ga-ready.yml         | Required - FAILING          |
| SemVer Label       | semver-label.yml     | Required                    |
| Governance         | governance-check.yml | Required                    |
| PR Quality Gate    | pr-quality-gate.yml  | Required                    |

---

## PR Triage Table

### Bucket A: Green + Low Risk (Merge Immediately)

| PR#   | Title                                           | Size | Lines    | GA-Eligible | Action    |
| ----- | ----------------------------------------------- | ---- | -------- | ----------- | --------- |
| 15597 | Make release workflow idempotent and concurrent | S    | +61/-9   | Y           | Merge 1st |
| 15596 | Release Freeze Policy Gate                      | M    | +252/-0  | Y           | Merge 2nd |
| 15594 | docs: add operational runbooks                  | M    | +335/-2  | Y           | Merge 3rd |
| 15591 | chore: add chaos test for signer/OPA            | M    | +246/-2  | Y           | Merge     |
| 15590 | feat: restore drill script + evidence           | M    | +253/-2  | Y           | Merge     |
| 15589 | feat: tenant observability alerts               | M    | +203/-2  | Y           | Merge     |
| 15588 | feat(policy): tenant isolation, quotas          | M    | +336/-0  | Y           | Merge     |
| 15587 | test: isolation, metering, rollback             | M    | +238/-2  | Y           | Merge     |
| 15586 | feat: configurable metering sinks               | S    | +70/-8   | Y           | Merge     |
| 15585 | feat: semver prev tag detection                 | M    | +207/-1  | Y           | Merge     |
| 15584 | feat: structured release notes                  | M    | +270/-0  | Y           | Merge     |
| 15583 | feat: policy hook decisions in maestro          | XS   | +30/-2   | Y           | Merge     |
| 15582 | docs: Maestro white-label sprint pack           | M    | +323/-2  | Y           | Merge     |
| 15581 | docs: Maestro Conductor sprint pack             | M    | +314/-0  | Y           | Merge     |
| 15577 | feat: ramp policy enforcement                   | M    | +457/-2  | Y           | Merge     |
| 15575 | fix: tenant-scoped graph queries                | M    | +256/-21 | Y           | Merge     |
| 15574 | Release Guardrails: Preflight Checks            | S    | +186/-0  | Y           | Merge     |
| 15570 | feat: provenance evidence export                | M    | +326/-6  | Y           | Merge     |
| 15569 | feat: deployment supply-chain verification      | S    | +165/-2  | Y           | Merge     |

### Bucket B: Larger Features (Need Review)

| PR#   | Title                                  | Size | Lines     | Risk | Action       |
| ----- | -------------------------------------- | ---- | --------- | ---- | ------------ |
| 15593 | feat: Gate Maestro privileged actions  | L    | +679/-43  | M    | Review first |
| 15592 | feat: Maestro provenance receipts      | L    | +770/-19  | M    | Review first |
| 15579 | feat: Switchboard tenant admin UI      | L    | +975/-17  | M    | Review first |
| 15578 | feat(policy): policy profile manifests | L    | +617/-190 | M    | Review first |
| 15573 | feat(tenancy): demo tenant bootstrap   | L    | +727/-13  | M    | Review first |
| 15572 | feat: tenant provisioning service      | L    | +681/-31  | M    | Review first |
| 15571 | feat: billing export snapshots         | L    | +640/-8   | M    | Review first |
| 15568 | feat: data retention purge workflow    | L    | +555/-2   | M    | Review first |

### Bucket D: Defer (High Risk / Large Deletions)

| PR#   | Title                               | Size | Deletions | Reason                 | Action |
| ----- | ----------------------------------- | ---- | --------- | ---------------------- | ------ |
| 15595 | feat: tenant usage exports          | XL   | -94169    | Massive file deletions | Defer  |
| 15580 | feat(branding): runtime brand packs | XL   | -94207    | Massive file deletions | Defer  |
| 15576 | feat: policy-gated impersonation    | XL   | -94160    | Massive file deletions | Defer  |

---

## CI Failure Analysis

### Top Blockers

1. **Integration Tests (CRITICAL)**
   - Error: `Can't find a root directory while resolving a config file path`
   - Cause: Jest/ts-jest configuration issue when running from root
   - Impact: Blocks all PR merges

2. **GA Risk Gate**
   - Error: Supply chain tools cache miss
   - Cause: go.sum not found (not a Go project)
   - Impact: Non-blocking but noisy

3. **Supply Chain Integrity**
   - Error: Various tool installation issues
   - Cause: External dependency fetching
   - Impact: Non-blocking

### Unblocker Plan

**Unblocker PR #1: Fix Integration Test Config**

- Root cause: Jest config path resolution when running from monorepo root
- Fix: Add explicit rootDir in jest.config.ts or use .cjs config
- Guard: Add CI step to verify test runs from both root and server dir

---

## Merge Queue

| Order | PR#       | Status  | Notes                 |
| ----- | --------- | ------- | --------------------- |
| 1     | UNBLOCKER | Pending | Fix Jest config first |
| 2     | 15597     | Ready   | Release workflow      |
| 3     | 15596     | Ready   | Release freeze gate   |
| 4     | 15594     | Ready   | Runbooks docs         |
| ...   | ...       | ...     | ...                   |

---

_Updated by GA Release Commander_

## End-of-Cycle FIX Outcomes

| Signal | Owner | Decision | Evidence | Notes | Rollover authorization |
| :--- | :--- | :--- | :--- | :--- | :--- |
| #15566 perf harness | @acme/ops-team | ESCALATE | `docs/release/QUEUE.md` | Blocked by typecheck | Yes |
| #15565 SLO policies | @acme/ops-team | CLOSE | `docs/ci/RELEASE_OPS_SLO_POLICY.yml` | Policy verified | No |
| #15564 roadmap docs | @acme/product | CLOSE | `docs/roadmap/next-priorities-2026-01-01.md` | Roadmap verified | No |
| #15563 maestro | @acme/platform | ESCALATE | `docs/release/QUEUE.md` | Deferred | Yes |
