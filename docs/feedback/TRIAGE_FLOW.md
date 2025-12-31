# Triage Flow

This flow operationalizes the intake model into a predictable triage cadence that enforces evidence quality, ownership, and SLA-aware routing.

## Roles

- **Triage Lead (daily):** Owns intake sweep, dedupe, and severity validation.
- **Domain DRIs:** Service/component owners accountable for fixes and mitigations.
- **Release Captain:** Ensures gating and regression-proof requirements are met before ship.
- **Customer Liaison:** Coordinates comms to CSMs/AMs for customer-impacting items.

## States

1. `new`
2. `triaged`
3. `in-progress`
4. `ready-for-release`
5. `shipped`
6. `closed`

## Step-by-Step Flow

1. **Sweep & Dedupe (Triage Lead):**
   - Review new cards 4x daily; auto-dedupe signature must be confirmed manually.
   - Reject cards lacking required fields from `INTAKE_MODEL.md`.
2. **Severity Validation (Triage Lead + DRI):**
   - Apply P0/P1/P2 rules from `PRIORITIZATION.md`.
   - Confirm blast radius and frequency; upgrade severity if ambiguity remains.
3. **Ownership Assignment (Triage Lead):**
   - Set accountable owner + backup per `PRIORITIZATION.md`.
   - Link to service/component and observability dashboards.
4. **Prioritization & Slotting (DRI + Release Captain):**
   - Slot item into fast patch lane, minor, or major track per `docs/release/RAPID_RELEASE.md`.
   - For P0/P1, create mitigation/rollback plan before work begins.
5. **Execution Tracking (DRI):**
   - Maintain status updates, verification steps, and evidence as checklist items on the card.
   - Attach reproducible steps or alert snapshots.
6. **Pre-Release Gate (Release Captain):**
   - Ensure regression-proof artifacts are added (tests, dashboards, or synthetic probes).
   - Confirm `verify-regression-safety` CI job is green for the change set.
7. **Ship & Close (Release Captain + Customer Liaison):**
   - Record shipped version/build, changelog link, and evidence of fix.
   - Update status to `shipped`, then `closed` once customer confirmation is captured per `CLOSURE_PROCESS.md`.

## SLAs & Cadence

- **P0:** triage within 15 minutes; owner assigned within 30 minutes; mitigation ETA ≤ 2 hours.
- **P1:** triage within 4 hours; owner assigned within same business day; mitigation ETA ≤ 2 business days.
- **P2:** triage within 1 business day; owner assigned within 2 business days.

## Metrics

- Intake-to-triage lead time (target: P0 ≤ 15m, P1 ≤ 4h, P2 ≤ 24h).
- % cards with complete evidence on first submission (target ≥ 90%).
- Mean time to mitigation per severity tier.
- Reopen rate (should trend to zero once regression gates are mature).

## Escalations

- Missing owner after SLA → auto-page functional leader and Release Captain.
- Reopened card due to regression → automatic RCA required and test gap logged in `verify-regression-safety` backlog.
