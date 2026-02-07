# Prompt: Governed CI/CD Evidence Pipeline

Build a governed CI/CD automation blueprint that enforces policy preflight checks, deterministic evidence generation, and governance verification gates for Summit.

## Requirements
- Add workflow orchestration updates to `.github/workflows/ci.yml`.
- Add reusable workflows for policy preflight and evidence bundle generation.
- Add OPA policy + tests for governance preflight.
- Add deterministic evidence bundle generator + governance verifier scripts.
- Add tests for evidence generation and governance verification.
- Add governance policy registry + evidence ID policy mapping.
- Add documentation describing the CI/CD evidence pipeline and control matrix.
- Update `docs/roadmap/STATUS.json` to record the change.

## Constraints
- Use deterministic outputs (no timestamps).
- Avoid untyped `any` and silent errors.
- Use conventional commit format.

## Deliverables
- Workflows, scripts, policies, tests, docs, and example evidence artifacts.
