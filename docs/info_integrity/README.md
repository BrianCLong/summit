# Info-Integrity Governance Module

## Scope
This module provides **Defensive Information Integrity** and **Responsible Influence Governance** tooling for Summit.

### Allowed Uses
- Compliance gating for model outputs.
- Aggregate information environment monitoring (topic/sentiment analysis at scale).
- Audit trail generation for model governance.
- Dataset hygiene and risk controls.

### Prohibited Uses (Capabilities Firewall)
- **NO** microtargeting or psychographic segmentation.
- **NO** automated persuasion or counter-messaging generation.
- **NO** covert influence operations guidance.
- **NO** individual-level tracking or identification.

## Policy Enforcement
The `influence_governance` policy pack enforces a deny-by-default stance on all prohibited intents and data fields.

## Evidence Artifacts
Every evaluation run generates:
- `report.json`: Compliance findings and safety notes.
- `metrics.json`: Block counts for prohibited intents/fields.
- `stamp.json`: Deterministic run metadata (contains the only allowed timestamps).

## Running Evaluations
```bash
python3 evals/info_integrity/run_evals.py
```
This runs synthetic fixtures (positive and negative) to verify policy enforcement.
