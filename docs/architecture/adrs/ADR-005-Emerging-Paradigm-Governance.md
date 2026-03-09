# ADR 005: Emerging Paradigm Alert Governance

**Date**: 2024-03-08
**Status**: Proposed
**Context**: The Technology Early Warning System (TEWS) will generate `EmergingParadigmAlerts` based on recurrence, survival, dependency readiness, and fork activity. If these alerts are passed directly to automated strategy systems or external analysts, false positives could trigger misallocation of resources or hallucinated architectural shifts.

**Decision**: We will require all `EmergingParadigmAlerts` to pass through the `Policy & Governance Agent`. Alerts must exceed strict confidence thresholds (e.g., > 0.85 recurrence score across > 5 distinct isolation domains) and must include deterministic provenance linking back to specific `CodeFragments` and `Commits`. An Executive Synthesis Agent or human analyst must approve alerts before they are formalized into Strategy Forecasts.

**Consequences**:
* **Positive**: Enforces the intelgraph Evidence Contract. Prevents speculative noise from polluting strategic forecasts.
* **Negative**: May suppress weak-signal detection (the very goal of TEWS) if thresholds are set too aggressively. Will require continuous tuning.
