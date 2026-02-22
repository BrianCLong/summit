# Repo Assumptions & Verification

## Verified Facts
- **Repo Root Structure:** `summit/` exists and contains core modules.
- **CLI Structure:** `summit/cli/` exists (contains `automation_verify.py`).
- **Feature Flags:** `summit/flags.py` manages feature toggles.
- **Documentation:** `docs/` contains subdirectories for standards, security, and ops.
- **Tests:** `summit/tests/` uses `pytest` structure.
- **Scripts:** `scripts/monitoring/` exists; `scripts/bench/` does not (will be created).

## Assumptions for IP Capture Feature
- **Pipeline Location:** `summit/pipelines/ip_capture/` will be the home for the new logic.
- **CLI Entry Point:** `summit/cli/main.py` or `summit/cli/__main__.py` will need to be created/updated to support `python -m summit.cli`.
- **Testing:** `pytest` is the standard runner.

## Must-Not-Touch
- `summit/cli/automation_verify.py` (unless adding imports carefully).
- Existing evidence schemas in `docs/evidence/`.
