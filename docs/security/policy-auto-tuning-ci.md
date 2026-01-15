# Policy Auto-Tuning CI

This document describes the CI/CD guardrails for the Policy Auto-Tuning Engine.

## Workflows

### `policy-auto-tuning-ci.yml`

This workflow runs on PRs affecting the policy engine or its scripts. It performs the following checks:

1.  **Unit Tests**: Executes `server/src/policy-engine/__tests__/engine.test.ts` to verify rule logic and determinism.
2.  **Golden Fixtures**: Runs the `policy-propose` CLI against a known set of evidence (`fixtures/security-evidence.json`) to ensure the pipeline is functional.
3.  **Safety Guardrails**: Greps the output proposals to ensure no "forbidden targets" are being patched.
    *   Forbidden: `*.ts` (Source code), `*secrets*` (Sensitive files).

## Forbidden Paths

To prevent the engine from modifying sensitive application code or secrets, the following paths are implicitly forbidden by the `Safety Guardrail` step:

*   Source code: `server/src/**/*.ts`, `apps/**/*.tsx`
*   Secrets: `.env`, `config/secrets.ts`
*   CI configs: `.github/workflows/`

The engine is currently scoped to only propose changes to:
*   `policy/allowlist.yaml`
*   `policy/governance-config.yaml`
