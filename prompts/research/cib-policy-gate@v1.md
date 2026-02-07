# Prompt: cib-policy-gate (v1)

## Objective

Create the governed narrative + CIB feature registry artifacts and the matching OPA policy gate with
baseline tests, plus required governance updates.

## Required outputs

- `docs/research/FEATURES_FRAME_CIB.yml`
- `docs/research/NARRATIVE_IO_READING_LIST.md`
- `docs/research/NARRATIVE_IO_REFERENCE_TO_PIPELINE_MAP.md`
- `policy/cib/README.md`
- `policy/cib/feature_registry.rego`
- `policy/cib/policy_test.rego`
- Roadmap update in `docs/roadmap/STATUS.json` referencing the CIB gate work.
- DecisionLedger entry with rollback steps.

## Constraints

- Evidence IDs and thresholds must align with the feature registry.
- No security control reduction; policy additions require human countersign.
- Keep outputs deterministic and offline-capable.

## Acceptance criteria

- OPA policy references all required evidence IDs and emits structured deny/warn reasons.
- Reading list and pipeline map reference the feature registry and policy gate.
- Roadmap summary counts remain consistent after update.
