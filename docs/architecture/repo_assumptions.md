# Repository Assumptions & Verification

## Verified Context
- **Structure:** Hybrid Monorepo with `src/` (TypeScript) and `summit/` (Python).
- **Config:** Feature flags located in `config/` (e.g., `config/feature-flags.json`).
- **Workflows:** GitHub Actions in `.github/workflows/`.
- **Evidence:** Evidence artifacts stored in `evidence/`.

## Assumptions
- **ITT/BEG Module Location:** New TypeScript modules will be placed in `src/graphrag/itt/` and `src/agents/itt/`.
- **Feature Flags:** A new `config/flags.ts` will be created to manage ITT-specific flags, following the pattern of `config/neo4j.ts`.
- **CI Scripts:** Custom verification scripts will be placed in `.github/scripts/`.

## CI Gates
- `ci:evidence-verify`: Validates evidence schemas.
- `ci:biometrics-privacy`: New gate to enforce privacy rules.
- `ci:agent-guardrails-no-evasion`: New gate to enforce agent guardrails.
