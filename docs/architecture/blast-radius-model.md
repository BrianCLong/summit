# Blast Radius Model

This model defines how tenant and compartment boundaries constrain the impact of defects, misconfigurations, or malicious actions. The goal is to ensure that any failure is contained to the smallest possible surface area and is rapidly detectable.

## Boundaries and scopes

- **Tenant boundary:** All customer data, compute, and observability signals are keyed by `tenantId`. Cross-tenant access is never implicit.
- **Compartment boundary:** Within a tenant, sensitive missions/programs are segmented via compartment labels. Access requires membership in all target compartments.
- **System boundary:** Global control-plane state (feature flags, topology, schedules) is read-only to tenants and write-limited to platform operators.

## Failure scenarios and containment

| Scenario | Expected containment | Enforcement hooks |
| --- | --- | --- |
| SQL query missing tenant filter | Impact limited to changed service only | `scopeSqlToTenant` injection + static scan gating |
| Background worker receives unscoped message | Message rejected before processing | `assertServiceIsolation` at consumer entrypoint |
| Cache key collision | Keys namespaced by tenant to prevent bleed-through | `tenantKey` helper and cache prefixing policy |
| Compartment mismatch | Request denied, audit trail emitted | `enforceCompartments` guard + service telemetry |

## Detection and CI gates

- **Static scanner:** `scripts/security/scan-tenant-isolation.mjs` blocks pull requests introducing new unguarded SQL/Cypher changes (fail-closed by default). Use `TENANT_SCAN_FULL=true` for periodic full sweeps.
- **Dynamic verifier:** `scripts/security/verify-tenant-isolation.ts` seeds multi-tenant fixtures and validates that isolation controls prevent leakage at runtime.
- **Unit contracts:** `packages/platform-governance/src/isolation/primitives.test.ts` codifies expected guardrail behavior.

## Operational responses

1. **Tripwire:** Any `IsolationViolationError` should be surfaced to centralized alerting with tenant + compartment context.
2. **Blast radius reduction:** Prefer rolling back or feature-flagging the offending service slice rather than broad restarts.
3. **Post-incident review:** Map the incident to the boundary type (tenant vs compartment) and add reproducing tests to the isolation primitives package.

By keeping boundaries explicit and instrumented, the platform bounds the blast radius of defects while maintaining clear auditability across data and service planes.
