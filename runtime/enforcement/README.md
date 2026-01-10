# Runtime Enforcement Architecture

The runtime enforcement layer keeps governance live by evaluating policies at every execution boundary with minimal latency and deterministic behavior.

## Placement

- **Ingress middleware (HTTP/GraphQL)**: Authn/authz, rate limiting, feature-flag gating, demo constraints.
- **Service boundaries**: Tenant isolation, data classification gates, provenance emission, dangerous operation guards.
- **Background jobs/workers**: Tenant context validation, feature flag checks, classification constraints before execution.

## Flow (textual diagram)

```
Client -> Ingress Middleware -> Policy Evaluator -> Decision
                                   |                 |
                                   v                 v
                           Evidence Emitter      Response Enforcer
                                   |                 |
                                   v                 v
                           Observability Bus   Application Handler
```

## Characteristics

- **Deterministic**: Reads centralized definitions from `runtime/policies/catalog.yaml` and `runtime/response-matrix.yaml`.
- **Low latency**: Pre-compiled policy lookups; cache static response profiles; no heavy network calls on hot paths.
- **Fail-closed**: Critical domains (authn/authz, tenant isolation, classified data, dangerous ops) deny on uncertainty.
- **Configurable**: Enforcement behavior driven by policy metadata and response profiles per environment.

## Components

- **Policy Loader**: Parses catalog and builds in-memory maps keyed by policy ID and domain.
- **Context Builder**: Normalizes request/job context (tenant, identity, classification, feature flags, environment, risk score).
- **Policy Evaluator**: Executes deterministic checks; integrates with OPA/decision engine for authz.
- **Response Enforcer**: Applies matrix-driven action (allow, deny, throttle, degrade, kill-switch).
- **Evidence Emitter**: Emits telemetry records following `runtime/telemetry/schema.json` with correlation IDs.

## Deployment Topology

- Library consumed by services in `server/` (HTTP middleware) and workers in `workers/`.
- Shared configuration delivered via config maps or environment-mounted bundles for parity across pods/nodes.
- Sidecar or in-process emission to observability pipeline (metrics, logs, traces) with backpressure-aware batching.

## Call Sequences

1. **Ingress**: parse identity -> build context -> evaluate policies -> enforce response -> emit evidence -> call handler.
2. **Service-to-service**: verify tenant and classification binding -> evaluate authorization -> emit provenance -> continue.
3. **Background job**: load tenant context -> validate feature flags and classification -> execute job or degrade/deny.

## Safe Defaults

- Missing policy definitions raise configuration errors at startup.
- Telemetry emission failures fail-closed for critical paths and degrade (retry/queue) for non-critical paths.
- Response actions are versioned to avoid drift across services.
