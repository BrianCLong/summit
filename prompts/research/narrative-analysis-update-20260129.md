# Narrative Intelligence Frames Contract Scaffold (2026-01-29)

You are implementing the Narrative Intelligence (NI) foundation lane for the 2026-01-29 research update.

## Objectives

- Add a frames contract with deterministic stub extraction in `narratives/frames/`.
- Provide fixture-driven evaluation inputs under `eval/narratives/fixtures/`.
- Implement a `GATE-FRAME-CONTRACT` verifier under `security/gates/`.
- Emit evidence artifacts under `evidence/` and register them in `evidence/index.json`.
- Update `docs/roadmap/STATUS.json` with the revision note for this work.

## Constraints

- No raw post text; use synthetic or hashed references only.
- Deterministic output; no randomness.
- Evidence bundle must include `report.json`, `metrics.json`, and `stamp.json`.

## Expected Outputs

- `narratives/frames/base.py`, `narratives/frames/stub.py`, `narratives/frames/validation.py`.
- `eval/narratives/run_eval.py` and fixture files.
- `security/gates/gate_frame_contract.py`.
- `evidence/EVD-NARRATIVE_IOPS_20260129-FRAMES-001/*` plus `evidence/index.json` entry.

## Verification

- Run `python eval/narratives/run_eval.py` to generate evidence.
