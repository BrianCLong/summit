# Prompt: Agentic Hybrid Provenance PR1

## Intent
Scaffold the agentic hybrid provenance evidence bundle, schemas, and CI gate.

## Scope
- evidence/AGENTIC-HYBRID-PROV/
- evidence/schemas/agentic-hybrid-prov-*.schema.json
- evidence/index.json
- .github/scripts/verify-evidence-bundle.ts
- .github/workflows/ci-verify.yml
- .github/policies/dependency-delta.md
- required_checks.todo.md
- docs/roadmap/STATUS.json

## Guardrails
- No timestamps outside evidence/AGENTIC-HYBRID-PROV/stamp.json.
- CI gate must fail on missing/invalid evidence bundle artifacts.
- Dependency changes must update DEPENDENCY_DELTA.md.
