# Goodfire-Style Interpretability Monitoring (Summit Standard)

## Intent
Summit asserts a deterministic, policy-driven behavior monitoring loop that mirrors the Goodfire
"model design environment" posture without weight edits or neuron-level interpretability. This
standard defines the import/export contract, evidence identity rules, and the governance perimeter
for the Agent Behavior Monitor so the system remains auditable and production-ready. It references
and aligns with the Summit Readiness Assertion for release posture and evidence expectations.

## Scope
- Applies to probe suite execution, evidence artifact generation, and CI gating.
- Governs report, metrics, and stamp artifacts produced by `summit:monitor`.
- Enforces deterministic ordering, hashing, and schema validation.

## Import/Export Matrix

### Imports (Summit consumes)
- Prompt suites (YAML/JSON) with explicit probe IDs and prompt templates.
- Model configurations (provider, model name, temperature bounds).

### Exports (Summit produces)
- `report.json`: probe-by-probe results with evidence IDs and verdicts.
- `metrics.json`: aggregate metrics suitable for regression gates.
- `stamp.json`: deterministic run identity (hash + provenance).
- `profile.json`: deterministic count-only profiling summary.

## Evidence Identity Pattern
Summit evidence IDs follow the deterministic pattern:

```
EVIDENCE:MONITOR:<probePackHash>:<probeId>:<caseHash>
```

- `probePackHash`: `sha256` of normalized probe pack JSON.
- `caseHash`: `sha256` of normalized prompt template + parameters.

## Determinism Rules
- Stable-sort all arrays by key (`probeId`, `caseId`, `evidenceId`).
- Exclude timestamps and non-deterministic fields from artifacts.
- Include `schemaVersion` in all artifacts.

## Non-Goals
- Weight-level interventions or training pipeline replacement.
- Neuron-level interpretability or SAE feature discovery.
- Direct model editing or weight-space steering.

## Guardrails
- CI-only enforcement by default; runtime hooks remain feature-flagged off.
- Evidence artifacts must validate against schema before gating.
- No direct model changes are permitted in this standard.

## Governance Alignment
- This standard is governed by `docs/governance/META_GOVERNANCE.md`.
- Evidence generation aligns with `docs/SUMMIT_READINESS_ASSERTION.md` requirements.
- Every change to this standard must preserve deterministic evidence production.

## Acceptance Signals
- Probe suites emit deterministic `report.json`, `metrics.json`, `stamp.json`.
- CI gates enforce regression thresholds and schema compliance.
- Evidence IDs remain stable across repeated runs with identical inputs.
