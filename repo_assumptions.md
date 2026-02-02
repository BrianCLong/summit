# Repo Assumptions & Reality Check

## FactCert Subsystem Status
*   **Status:** Missing / Green field.
*   **Target Location:** `packages/factcert/`
*   **Workspace:** Part of `packages/*` workspace in `pnpm-workspace.yaml`.

## Conventions Assumed
*   **Package Name:** `@intelgraph/factcert`
*   **Testing:** `vitest` (consistent with repo memory/other packages).
*   **Building:** `tsx` for execution, `tsc` for type checking.
*   **Artifacts:** `artifacts/factcert/` (standard artifact output location).
*   **Fixtures:** `fixtures/factcert/` (standard fixture location).
*   **Schemas:** JSON Schemas in `packages/factcert/schema/*.schema.json`.
*   **Linting:** Standard repo eslint/prettier config.

## Missing Elements to Create (PR1)
*   Package scaffold (`package.json`, `tsconfig.json`).
*   Core Libraries:
    *   `src/lib/stable_json.ts` (Determinism).
    *   `src/lib/hashchain.ts` (Audit trail).
    *   `src/lib/ed25519.ts` (Signing).
*   Schemas:
    *   `credential.schema.json`
    *   `audit_trail.schema.json`
    *   `controls_report.schema.json`
    *   `stamp.schema.json`
*   Fixtures:
    *   `user.json`
    *   `credential_example.json`

## CI/CD
*   No existing CI checks for `factcert`.
*   New checks will need to be added to `required_checks.todo.md` or similar if we were editing workflows (out of scope for PR1 code changes, but noted).

## Constraints
*   **Determinism:** Must use canonical JSON stringification.
*   **No PII:** Strict separation of concerns.
*   **Regulated Output:** No "admissible", "compliant", "fraud" claims in code strings/outputs.
