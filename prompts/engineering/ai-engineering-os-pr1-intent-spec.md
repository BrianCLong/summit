# Prompt: AI Engineering OS PR-1 (Intent Spec + Change Contracts)

You are operating in the Summit monorepo. Implement PR-1 for the AI Engineering
OS initiative: Intent Spec schema + validator CLI + CI gate.

## Objectives

1. Add an intent spec schema stored under `schemas/`.
2. Add a validator CLI: `summit-intent validate`.
3. Add CI enforcement to require intent specs when a PR is AI-generated or
   touches sensitive paths.
4. Add documentation for the intent spec and AI Engineering OS workflow.
5. Update `docs/roadmap/STATUS.json` with the new work.
6. Provide a sample intent spec in `.summit/intent/`.

## Constraints

- Use existing dependencies (Ajv, js-yaml, minimatch, commander).
- Keep output deterministic and avoid logging secrets.
- Add unit tests for schema validation and change contract checks.
- Do not add try/catch blocks around imports.

## Acceptance Tests

- `node --test scripts/intent/__tests__/intent-validator.test.mjs`
- `node scripts/intent/summit-intent.mjs validate`

## Output

- Schema: `schemas/intent-spec.schema.json`
- CLI: `scripts/intent/summit-intent.mjs`
- CI gate: `.github/workflows/pr-quality-gate.yml`
- Docs: `docs/intent-spec.md`, `docs/ai-engineering-os.md`
- Roadmap update: `docs/roadmap/STATUS.json`
- Intent example: `.summit/intent/intent-spec-pr1.yaml`
- Task spec: `agents/examples/` with prompt hash reference
