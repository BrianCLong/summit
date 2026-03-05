# Repo Assumptions for Gemini Enterprise Adapter

Verified: limited live inspection

Assumed:
- `summit/providers/` remains the active Python provider integration surface.
- `tests/` executes Python tests via root `pytest.ini`.
- `evidence/` stores deterministic JSON artifacts.
- CI can validate deterministic JSON artifacts in future gate expansion.

Must-not-touch:
- Core evaluation engine
- Existing provider adapters
- Existing evidence schema contracts
