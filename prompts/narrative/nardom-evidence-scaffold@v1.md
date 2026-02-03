# Prompt: NARDOM Evidence Scaffolding (v1)

You are implementing the Narrative Intelligence (NARDOM) evidence bundle scaffolding.
Focus on evidence artifacts, schemas, and deterministic validation gates only.

## Constraints

- Additive-only changes; no production runtime behavior changes.
- Timestamps must exist only in `stamp.json` for NARDOM evidence bundles.
- Evidence IDs must match `EVD-NARDOM-<AREA>-<NNN>`.
- Update `docs/roadmap/STATUS.json` and record the decision in the DecisionLedger.
- Keep changes deterministic and auditable.

## Deliverables

- Evidence templates in `evidence/narrative_intel/`.
- Schemas in `evidence/schemas/` for NARDOM report/metrics/stamp/index.
- Evidence index mapping updated in `evidence/index.json`.
- Verifier updates in `tools/ci/verify_evidence.py`.
- Required checks discovery updated in `required_checks.todo.md`.
- Narrative Intel README in `docs/narrative_intel/README.md`.
- Task spec in `agents/examples/` and prompt registry entry in `prompts/registry.yaml`.
