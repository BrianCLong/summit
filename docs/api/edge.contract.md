# Edge/Gateway Contract (v1 Foundation)

## Purpose
Define ingress contract that supplies authenticated tenant context to Summit core workflows.

## Required Inputs to Summit
- `orgId`
- `actorId`
- Auth claims sufficient for role and entitlement lookup
- Request correlation ID for evidence linking

## Required Guarantees
- Requests without `orgId` are rejected before reaching internal runtimes.
- Actor context must be immutable for downstream policy evaluation.
- Correlation IDs propagate into Switchboard/Maestro runtime metadata.

## Observability
Edge must log policy-relevant context keys without secrets/PII payloads and emit request counters by org and route.
