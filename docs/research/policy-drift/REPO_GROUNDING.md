# Policy Drift Repo Grounding

## Policy and configuration sources

- `policy/governance-config.yaml`: environment modes, enforcement flags, and bundle mappings for the policy engine.
- `server/config/egress-allowlist.json`: baseline allowlist for external calls.
- `policy/retention.yaml`: retention defaults and residency/lineage requirements leveraged by compliance services.
- Environment variables consumed in `server/src/routes/admin.ts` (budgets, rate limits, model gating) shape runtime behavior.

## Effective runtime computation

- `server/src/services/PolicyEngine.ts` loads `policy/governance-config.yaml` and falls back to strict defaults when missing.
- `server/src/routes/admin.ts` exposes mutable runtime settings via `memConfig` with precedence over file defaults.
- `server/src/middleware/authorization.js` and `server/src/routes/security/security-admin.ts` enforce role/tenant context for admin actions.
- Default redaction/attribution guards are toggled through environment flags (`STRICT_ATTRIBUTION`, `REDACTION_ENABLED`, `RATE_LIMIT_MAX`, `BUDGET_CAP_USD`).

## Runtime introspection surfaces

- Admin configuration endpoints under `/api/admin` (e.g., `/admin/config`, `/admin/opa/validate`) provide visibility into applied configs.
- OPA bundle validation routes (`/admin/opa/*` in `server/src/routes/admin.ts`) expose the currently loaded policy bundle source.

## Audit and incident patterns

- `server/src/audit/advanced-audit-system.ts` provides append-only audit logging with schema enforcement.
- `server/src/security/incident-response.ts` emits telemetry for security-relevant HTTP responses.
- SOC-style signaling is routed through `telemetry.subsystems.security` counters (see `server/src/lib/telemetry/comprehensive-telemetry.js`).

This grounding is the authoritative map for generating and validating effective policy snapshots against the repository baseline.
