# Violation Response Matrix

Runtime violations trigger deterministic responses based on policy severity and environment. Response profiles are defined in `runtime/response-matrix.yaml` and applied by the enforcement layer.

## Response Types

- **Warn**: Structured log + metric only; no user impact.
- **Throttle**: Apply token-bucket/backpressure controls; may degrade throughput.
- **Degrade**: Execute safe, read-only, or reduced-capability path.
- **Deny**: Reject the request/operation with a structured error.
- **Kill switch**: Immediately block the capability and surface an operator alert.

## Profiles

- **critical-auth**: Deny in non-prod; kill switch in prod if ambiguity or failure occurs.
- **isolation**: Always deny; tenant isolation never degrades.
- **demo**: Prefer degrade in non-prod; deny in prod to prevent unintended demo behavior.
- **throttling**: Throttle across environments; degrade if backpressure exceeds thresholds.
- **provenance**: Deny if evidence cannot be persisted; retries allowed but default deny.
- **feature-gates**: Deny if flag state is unknown or disabled.

## Environment Modifiers

- **dev**: Allows degrade for medium severity; critical remains fail-closed.
- **demo**: Prioritizes degrade for UX continuity but preserves classification and isolation guarantees.
- **staging**: Mirrors prod responses except kill-switch replaces with deny for safety.
- **prod**: Fail-closed for critical/high; kill switches enabled for critical-auth ambiguity.

## Incident Hooks

- Alerts fire on deny/kill for critical policies.
- Repeated throttling triggers backlog items for capacity tuning.
- Evidence from responses is exportable for audits via `scripts/runtime/export-signals.ts`.
