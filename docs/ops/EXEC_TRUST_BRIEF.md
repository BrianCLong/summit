# Executive Trust Brief: Operational Confidence

**To:** Leadership / Stakeholders
**From:** Engineering Operations
**Subject:** Operational Trust Signals (Month-1)

## What is "Operational Trust"?

Operational Trust is our measure of **system predictability**. It answers: *"Can we ship a change today without breaking the platform or violating compliance?"*

We do not rely on "feelings"; we rely on 5 provable signals.

## How We Measure It

We track a **Weekly Trust Snapshot** covering:

1.  **Stability**: Is the build pipeline reliable? (>95% pass rate)
2.  **Security**: Are there zero known high-severity vulnerabilities?
3.  **Governance**: Are the rules of the road (AGENTS.md) intact?
4.  **Evidence**: Are we proving our work every week?
5.  **Hygiene**: Is the codebase clean of untracked garbage?

## Warning Signs (When to Worry)

Leadership should intervene if:

*   **Red Status Persists**: The Weekly Trust Report remains Red for > 2 consecutive weeks.
*   **Evidence Stops**: The `EVIDENCE_INDEX.json` stops updating.
*   **Silence**: No Weekly Trust Report is published on Tuesday.

## Access

*   **Live Metrics**: Run `./scripts/ops/generate-trust-snapshot.sh`
*   **Weekly Reports**: stored in `docs/ops/reports/` (or designated wiki/issue tracker).

---
*This framework ensures we catch drift before it becomes debt.*
