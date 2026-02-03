# Decision Log: Ingress NGINX Retirement Bundle

## Decision

Adopt a controller-neutral, governance-first bundle that detects ingress-nginx usage, blocks
regressions, and emits deterministic evidence bundles.

## Rationale

- The retirement timeline requires proactive readiness and audit-grade evidence.
- Gate-based enforcement reduces security drift and aligns with Summit governance expectations.
- Migration mechanics remain intentionally constrained to avoid vendor lock-in in Lane 1.

## Alternatives Considered

- Vendor-specific migration guidance: deferred pending controller selection.
- Direct cluster automation: deferred pending platform access and risk review.

## Readiness Assertion Reference

The bundle aligns with the Summit Readiness Assertion to preempt readiness scrutiny and enforce
evidence-driven controls. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Consequences

- New ingress-nginx references are denied by default.
- Documentation and evidence artifacts become mandatory for bundle changes.

## Status

Accepted.
