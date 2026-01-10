# Config Governance

## Guardrails

We employ a **Code-Level Verification** strategy to ensure GA configuration compliance.

### 1. Default Value Verification
A script `scripts/config/verify_ga_defaults.ts` runs in CI/CD to assert that:
*   Critical `mvp1.*` flags default to `true`.
*   Experimental flags default to `false`.

### 2. Schema Validation
The application uses `zod` in `server/src/config/schema.ts` to strictly validate configuration at startup.
*   In Production (`NODE_ENV=production`), `CONFIG_VALIDATE_ON_START=true` should be set to force a hard crash on invalid config.

## Review Process
*   Any PR modifying `server/src/config/` must be labeled `area/config`.
*   Changes to `flags.ga.yaml` or `featureFlags.ts` require checking `docs/config/CONFIGURATION_SAFETY_RULES.md`.
