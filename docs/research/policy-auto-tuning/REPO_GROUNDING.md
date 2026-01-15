# Repo Grounding: Policy Auto-Tuning

## 1. Policy Configuration Locations

The primary configuration targets for the auto-tuning engine are:

*   **`policy/allowlist.yaml`**: Contains security exceptions (IDs, owners, tickets, expiration).
    *   *Structure*: List of objects with `id`, `owner`, `ticket`, `expires`.
    *   *Usage*: Checked by `.security/security-gates-checker.sh` and various scripts.
*   **`policy/governance-config.yaml`**: Defines environment enforcement modes and policy bundles.
    *   *Structure*: `environments` (dev/staging/prod settings) and `policies` (criticality, paths).
    *   *Usage*: Loaded by `server/src/services/PolicyEngine.ts`.
*   **`server/src/config/schema.ts`**: Zod schema for server runtime configuration (e.g., rate limits, feature flags).
    *   *Usage*: Validates `process.env` and config files at startup.

## 2. Configuration Loading & Validation

*   **Policy Engine**: `server/src/services/PolicyEngine.ts` uses `js-yaml` to load `policy/governance-config.yaml`. It has a fallback if the file is missing or invalid.
*   **Server Config**: `server/src/config/index.ts` (implied) uses `schema.ts` to validate configuration.
*   **Validation**:
    *   `policy/allowlist.yaml`: Currently validated ad-hoc by shell scripts or JS scripts like `scripts/vuln-allow.js`.
    *   `policy/governance-config.yaml`: No explicit Zod schema found in codebase; loaded as `any` in `PolicyEngine.ts`.

## 3. Existing Governance & Automation

*   **CI Gates**: `.github/workflows/` contains workflows like `verify-security-controls.yml`.
*   **Scripts**: `scripts/ops/` and `scripts/security/` contain operational tools.
*   **Audit**: `AdvancedAuditSystem` (`server/src/audit/advanced-audit-system.ts`) records decisions.

## 4. Integration Points

The Policy Auto-Tuning Proposal Engine will:

1.  **Ingest Signals**: From `AuditSystem` logs, `PolicyEngine` deny events, and external alerts.
2.  **Target Files**:
    *   `policy/allowlist.yaml` (for adding/expiring exceptions).
    *   `policy/governance-config.yaml` (for changing enforcement modes).
    *   `server/src/config/defaults.ts` (hypothetically, or patching env vars).
3.  **Generate Proposals**: JSON artifacts describing the diff.
4.  **Governance**: New API endpoints in `server/src/routes/` to review proposals.
