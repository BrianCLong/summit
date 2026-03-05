# Summit GA Launch Conversion Playbook (Integration → Stabilization → Launch)

## Summit Readiness Assertion
Summit is intentionally constrained in a pre-GA integration state. This playbook converts the current posture into a launch-capable release system by enforcing deterministic integration, evidence-locked promotion, and measurable reliability contracts.

## Scope
- Primary zone: release process and governance operations.
- Objective: move from infrastructure growth signals to externally defensible GA launch readiness.
- Time horizon: 4-week execution with weekly hard gates.

## Hidden Structural Issues Causing PR Explosion (and Fixes)

### 1) Required-check drift (phantom or unstable check contexts)
**Failure mode**
- Branch protection requires check names that are renamed, duplicated, or not emitted on all PR paths.
- PRs accumulate in blocked `Expected`/`Pending` state with no deterministic merge path.

**Fix contract**
- Require one durable check on RC branch: `pr-gate / gate`.
- Move all full-suite workflows to merge-queue + nightly lanes.
- Add branch-protection drift sentinel that fails if required contexts differ from manifest.

**Deliverable**
- `required-checks.manifest.json` as source of truth and CI comparison target.

### 2) CI fan-out saturation (workflow over-triggering)
**Failure mode**
- Many workflows trigger on `pull_request` with broad paths, creating queue starvation.
- Teams open replacement PRs while waiting; backlog multiplies without net delivery.

**Fix contract**
- Two-tier CI model:
  - PR lane: lint, typecheck, unit, evidence validation only.
  - Merge queue/nightly lane: integration, e2e, security/compliance, soak checks.
- Add strict per-PR concurrency groups to auto-cancel superseded runs.

**Deliverable**
- CI trigger matrix documenting allowed events by workflow class.

### 3) Parallel integration without merge queue (conflict storm)
**Failure mode**
- Multiple PRs validate against stale branch state, then fail after unrelated merges.
- Rebase churn and duplicate PRs inflate queue size and cycle time.

**Fix contract**
- Enforce merge queue on `release/v4-ga`.
- Disable direct merges; only queue-promoted commits can land.
- Promote from RC to `main` through signed release tags.

**Deliverable**
- Protected branch policy with merge queue as sole integration mechanism.

## 8-Phase Launch Execution Sequence

### Phase 1: Freeze Surface Area (Launch Control)
1. Cut `release/v4-ga` from current green baseline.
2. Lock `main` to PR-only, no direct merges.
3. Route all stabilization work to RC branch merge queue.

**Exit gate**: zero direct merge permissions on RC + `main`.

### Phase 2: Backlog Collapse Engine
1. Hourly PR planner classifies open PRs (`obsolete`, `blocked`, `needs-rebase`, `queue:merge`).
2. Auto-close no-op and duplicate PRs with evidence comment.
3. Escalate only business-critical blocked PRs to manual triage.

**Exit gate**: merge-ready queue reduced to actionable set.

### Phase 3: CI Determinism
1. Enforce `pr-gate` as sole required PR check.
2. Full CI restricted to merge queue + nightly.
3. Add workflow concurrency + cancellation guardrails.

**Exit gate**: median PR check time and queue wait trending down for 48h.

### Phase 4: Evidence Lock
1. Build deterministic release bundle under `release-artifacts/`:
   - `sbom.spdx.json`
   - `slsa.attestation`
   - `evidence-map.yaml`
   - `security-ledger.yaml`
   - `report.json`
   - `stamp.json`
2. Gate promotion on reproducible hashes and provenance signature validity.

**Exit gate**: reproducible artifact hash across two clean runs.

### Phase 5: Infrastructure Stabilization
1. Keep two long-lived environments only: `staging`, `production`.
2. Enforce promotion flow: build → staging deploy → system tests → promote.
3. Block infra mutation during RC unless `infra-approved` label present.

**Exit gate**: 7 consecutive staging promotions with no rollback.

### Phase 6: Observability Completion
1. Establish mandatory telemetry:
   - request latency
   - graph query latency
   - agent execution time
   - queue depth
2. Add distributed tracing across Switchboard → Maestro → IntelGraph → Agent pipeline.

**Exit gate**: dashboards and alerts live with on-call ownership.

### Phase 7: GA Readiness Gates
All must pass:
- 24h green on merge queue CI
- empty RC merge queue
- no critical security findings
- reproducible release bundle
- staging soak stability (12–24h)

### Phase 8: Launch Mechanics
1. Tag release (`summit-v4-ga`).
2. Publish signed artifacts (images/charts/specs/docs).
3. Open post-launch accountability window (7 days).

## Forward-Leaning Enhancement (Innovation)
Deploy a **Risk-Weighted Merge Queue Scheduler**:
- Scores PRs using blast radius, changed zones, and flaky-test history.
- Prioritizes low-risk/high-signal merges first.
- Maximizes throughput while minimizing queue failure churn.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Infra, Observability, Security, Agents, Tools.
- **Threats Considered**: branch-protection tampering, CI resource exhaustion, evidence forgery, unsafe direct deploy, rollback drift.
- **Mitigations**: branch drift sentinel, deterministic CI tiering, signed evidence bundle gate, promotion-only deployment, rollback runbook trigger thresholds.

## Success Metrics (Launch-Blocking)
- PR lead time (P50/P95)
- Merge queue failure rate
- Flake rate by workflow class
- Staging-to-prod promotion success rate
- Error budget consumption rate
- Compliance bundle completeness rate

## Finality Statement
Summit reaches GA readiness only when integration is serialized, evidence is deterministic, reliability targets are explicit, and release promotion is policy-enforced end-to-end.
