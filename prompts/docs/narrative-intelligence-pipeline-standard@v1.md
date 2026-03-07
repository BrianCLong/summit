# Prompt: Narrative Intelligence Pipeline Standard (STD-004)

## Objective
Create a governed, implementation-grade Narrative Intelligence Pipeline (NIP) standard including
schema extensions, deterministic state machine transitions, scored metrics, CI-style tests,
evidence outputs, provenance receipts, and SOC-style controls.

## Requirements
- Author and maintain `docs/standards/04-requirements/STD-004-Narrative-Intelligence-Pipeline.md`
  using STD-000 structure and normative language.
- Add machine-readable implementation artifacts under
  `docs/standards/04-requirements/nip/`:
  - `node-edge-schema.v1.json`
  - `state-machine.v1.json`
  - `metric-formulas.v1.yaml`
  - `ci-gates.v1.yaml`
  - `evidence-bundle.schema.json`
- Update `docs/standards/README.md` to index the standard.
- Update `docs/roadmap/STATUS.json` with revision note and initiative linkage.
- Include MAESTRO alignment (layers, threats, mitigations).
- Reference Summit Readiness Assertion for authority alignment.

## Constraints
- Deterministic outputs: no timestamps in deterministic artifact filenames; run time belongs in
  `stamp.json`.
- Enforce strict separation between observed artifacts and inferred claims.
- No changes outside declared scope.

## Deliverables
- Updated STD-004 narrative standard.
- Machine-readable schema and gate pack in `docs/standards/04-requirements/nip/`.
- Updated standards index and roadmap status.
