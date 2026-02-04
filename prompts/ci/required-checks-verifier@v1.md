# Required Checks Verifier Scaffold (v1)

## Purpose
Establish a minimal Summit CI verifier for required status checks and keep the discovery runbook
aligned with the verifier configuration.

## Scope
- Add or update the required checks configuration under `summit/ci/verifier/`.
- Keep `required_checks.todo.md` aligned with temporary verifier names.
- Update `docs/roadmap/STATUS.json` with the revision note and timestamp.

## Guardrails
- Keep changes minimal and deny-by-default when required checks are absent.
- Avoid introducing new dependencies.
- Ensure outputs are deterministic.
