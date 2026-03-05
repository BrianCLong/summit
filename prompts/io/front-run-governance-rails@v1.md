# Prompt: Front-Run Governance Rails (Defensive-Only)

## Objective
Establish defensive-only governance rails for the front-run IO capability bands, including authoritative documentation, dual-use policy, segment governance policy, and CI policy gate scaffolding. Update roadmap status accordingly.

## Required Outputs
- `docs/io/front_run_bands.md`
- `policy/dual_use_policy.md`
- `policy/segment_governance.yaml`
- `ci/policy_checks/dual_use_policy_gate.py`
- `ci/policy_checks/segment_policy_gate.py`
- `docs/roadmap/STATUS.json`

## Constraints
- Defensive-only scope; no offensive optimization guidance.
- Policy and evidence requirements must be explicit and enforceable.
- Deterministic, auditable outputs with evidence ID references.

## Acceptance Criteria
- Governance docs cite authoritative files and define guardrails.
- Policy gates fail if guardrails are missing.
- Roadmap status updated to reflect the initiative.
