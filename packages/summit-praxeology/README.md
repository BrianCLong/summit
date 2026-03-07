# @summit/summit-praxeology

Analytic/defensive Praxeology Graph (PG) foundation for Summit.

## Contract

This package is intentionally non-prescriptive:

- validates PG playbooks against JSON schema and semantic policy gates,
- emits bounded hypotheses (evidence fit + missing evidence),
- never emits recommended actions or execution instructions.

## APIs

- `validatePlaybook(playbook)` → `{ ok, schemaErrors, semanticViolations }`
- `matchPlaybook({ playbook, actionSignaturesById, evidence })` → `PGHypothesis`

## Safety Guardrails

- `additionalProperties: false` schema controls
- required `contentSafety` flags (`analyticOnly=true`, `forbidPrescriptive=true`)
- semantic forbidden-language checks for prescriptive phrasing

## Local Use

```bash
pnpm --filter @summit/summit-praxeology test
pnpm --filter @summit/summit-praxeology build
```
