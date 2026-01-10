# Failure Modes and Safe Boundaries

This document defines fail-closed expectations, graceful degradation boundaries, and automated rollback triggers for the runtime governance layer.

## Must Never Fail Open

- **Authentication & Authorization**: Unknown/expired tokens, policy engine errors, or cache misses must deny.
- **Tenant Isolation**: Missing tenant context, unsigned tenant headers, or partition filter failures must deny.
- **Classified Data Paths**: Missing classification tags, DLP scan errors, or sink ambiguity must deny.
- **Dangerous Operations**: Destructive/bulk actions without dual control or valid breakglass token must deny/kill.
- **Provenance Emission**: If evidence cannot be persisted, default deny and alert; no silent loss.

## May Degrade Gracefully

- **Demo Mode Restrictions**: Prefer read-only or synthetic data paths when enforcement uncertainty occurs.
- **Rate Limiting/Throttling**: Shift from throttle to degrade when backpressure exceeds thresholds.
- **Feature Flags**: When auxiliary flag evaluation services are slow, default deny; degrade only for non-critical flags in dev/demo.

## Automated Rollback/Shutdown Triggers

- **Kill switch**: Triggered when critical-auth policies encounter ambiguous identity or policy evaluation errors in prod.
- **Telemetry gaps**: Consecutive evidence emission failures > N minutes trigger progressive deny and operator page.
- **Drift detection**: Runtime decisions deviating from CI baselines escalate risk scores and can tighten CI gates.

## CI Checks for Fail-Closed Guarantees

- Validate `runtime/policies/catalog.yaml` and `runtime/response-matrix.yaml` schema and referential integrity.
- Unit tests should assert fail-closed behavior for critical domains and deny on missing context.
- Static analysis ensures policy evaluation calls are present on all ingress and dangerous operation paths.
