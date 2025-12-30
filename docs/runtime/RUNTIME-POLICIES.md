# Runtime Policy Catalog

This catalog defines the mandatory runtime guardrails that keep Summit aligned with audited intent even under live load. Policies are centralized, declarative, and enforced uniformly across HTTP/GraphQL middleware, service boundaries, and background workers.

## Domains

### Authentication & Authorization

- **Authn required**: Reject unauthenticated traffic; verify token signatures, freshness, and revocation. Fail closed.
- **Authz scope**: Evaluate every privileged action through the policy engine with least-privilege scopes and tenant binding.

### Tenant Isolation

- **Tenant context propagation**: Every request, async task, and event carries a signed tenant context.
- **Data partitioning**: Data access layers enforce tenant filters and tenant-specific keys.

### Demo Mode Constraints

- **Read-only**: Mutations are degraded or denied in demo environments.
- **Data redaction**: Sensitive or regulated data is redacted or replaced with synthetic equivalents.

### Rate Limiting

- **Request ceilings**: Per-identity and per-tenant ceilings with burst budgets and deterministic throttling.
- **Concurrency caps**: Protect expensive operations with capacity-aware admission control.

### Data Classification Handling

- **Classified access**: Hardened auth levels, MFA, and context binding for classified resources.
- **Outbound filtering**: DLP and sink-allow lists prevent exfiltration to non-compliant targets.

### Provenance Emission

- **Provenance required**: All critical decisions emit immutable provenance events with correlation IDs.

### Feature Flag Enforcement

- **Flag gate**: Risky or experimental features stay behind centrally managed flags and kill switches.

### Dangerous Operation Gating

- **Destructive action guard**: Dual control or breakglass required for destructive/bulk operations.
- **Admin surface minimization**: Short-lived, least-privilege admin sessions only.

## Principles

- **Fail closed on critical paths**: Authn/authz, tenant isolation, and classified data never fail open.
- **Deterministic enforcement**: Policy decisions are consistent across environments via shared definitions.
- **Single source of truth**: Policies live in `runtime/policies/catalog.yaml`; runtime reads from it directly.
- **Evidence-first**: Every decision emits telemetry following `runtime/telemetry/schema.json` for auditability.

## Enforcement Targets

- Ingress middleware (HTTP/GraphQL) executes authn/authz, rate limiting, feature flags, and demo-mode degradation.
- Service boundaries enforce tenant isolation, data-classification checks, and provenance emission.
- Background jobs validate tenant context, classification constraints, and feature flag states before execution.

## Change Management

- Update policy definitions in `runtime/policies/catalog.yaml` and sync consumers via config reload.
- Add new response profiles in `runtime/response-matrix.yaml` to align enforcement with severity and environment.
- Any relaxation requires documented rationale and compensating telemetry.
