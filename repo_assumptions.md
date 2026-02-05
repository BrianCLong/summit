# Repo Assumptions for WideSeek-R1 Subsumption

## Verified
- Agents live under: summit/agents/
- Tools live under: summit/tools/
- Eval harness lives under: summit/eval/
- Training harness lives under: summit/train/
- Security modules live under: summit/security/
- Artifact outputs go to: evidence/ (based on evidence/README.md)
- Evidence logic: summit/evidence/
- Fixtures: summit/fixtures/
- CLI: summit/cli/

## Assumed (to verify)
- CI gates: ruff, pytest (verified existence of ruff.toml and pytest.ini)

## Must-not-touch (until verified)
- .github/workflows/*
- pyproject.toml / requirements lockfiles
- Any production policy enforcement modules
