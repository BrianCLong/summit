# Repo Assumptions

## Verified
- Repo root has `prompts/` directory.
- `summit/` is a Python package with `cli/` and `eval/`.
- `summit/tests/` exists and contains tests.
- Existing prompts use YAML format (e.g., `code.critic@v1.yaml`).
- `pyproject.toml` exists in the root.

## Assumed
- `pytest` is the test runner.
- `summit/prompts/` is the best place for new prompt logic.
- `summit/cli/` is the best place for the new CLI command.

## To-verify
- Can I run `summit` CLI? (Failed earlier, will create `summit/cli/main.py`).

## Must-not-touch
- `src/` core execution paths (unless confirmed).
- `data/` (not seen but assumed).
