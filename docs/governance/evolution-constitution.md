# Summit Evolution Constitution

## Authority

This constitution governs architectural evolution for Summit and IntelGraph. It is designed to
prevent drift, preserve determinism, and protect Golden-Main readiness.

## Constitutional Laws

1. **Evidence-Bound Entities**
   - Every entity must reference evidence provenance before promotion to durable graph state.

2. **Canonical Edge Identity**
   - All graph edges must reference canonical IDs only.
   - Non-canonical edges are invalid writes.

3. **Validated Agent Mutation**
   - Agents cannot modify graph state without passing validation gates:
     - canonical-ID check
     - evidence-budget check
     - policy authorization check

4. **Non-Bypassable Control Loops**
   - Control-loop telemetry and health monitors are mandatory runtime controls.
   - These controls cannot be disabled outside governed exception workflow.

5. **Deterministic Intelligence Artifacts**
   - Intelligence outputs (`alert`, `brief`, `report`) must be deterministic, auditable, and
     reproducible from recorded inputs and policies.

## Governance Requirements

### Required Artifacts Per Change Class

- **Semantic report:** `report.json`
- **Quantitative metrics:** `metrics.json`
- **Provenance stamp:** `stamp.json`

### Required Decision Outputs

Each architecture-impacting PR must include:
- decision rationale
- confidence score
- rollback trigger + rollback steps
- accountability window and monitored metrics

## Enforcement Model

A change is merge-eligible only if all constitutional laws are satisfied and evidence artifacts are
present.

Violation treatment:
- considered a build-blocking defect
- requires rollback or governed exception before progression

## Evolution Guardrails

- Schema evolution must be versioned and migration-safe.
- Autonomy expansion is prohibited before epistemic and credibility controls are active.
- New simulation capabilities require forecast calibration tracking.
- Any policy exception must be explicit, time-bounded, and evidence-backed.

## Finality Clause

Constitutional compliance is an execution prerequisite, not a post-merge aspiration.
