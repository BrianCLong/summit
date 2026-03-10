# Repository Assumptions for AgentVista Integration

## Assumed Structure
`summit/`
 ├ `agents/`
 ├ `benchmarks/`
 ├ `pipelines/`
 ├ `evidence/`
 ├ `scripts/`
 ├ `docs/`
 ├ `policies/`
 ├ `tests/`
 └ `.github/workflows/`

## Must-Not-Touch
* `core/reasoning-engine/*`
* `security/policy-engine/*`
* `graph/*`

## Validation Checklist
Before implementation:
1. Confirm benchmark directory naming
2. Verify evidence schema
3. Check CI check names
4. Confirm artifact storage path
5. Confirm GraphRAG ingestion path
