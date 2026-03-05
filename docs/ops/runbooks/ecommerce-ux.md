# Runbook: E-Commerce UX Conversion Readiness Gates

## Purpose

Operational runbook for troubleshooting and governance escalation when e-commerce UX gates fail.

## Gate Failure Response

1. Identify failing gate (`ux-mobile-check`, `page-speed-check`, `cta-contrast-check`, etc.).
2. Capture deterministic evidence artifacts and attach to incident context.
3. Apply remediation from module-specific guidance.
4. Re-run gate locally and in CI.

## Temporary Override Protocol

- Overrides are constrained and require explicit governance record.
- Every override must include:
  - reason,
  - expiration,
  - rollback trigger,
  - owner.
- Expired overrides are treated as policy violations.

## Escalation Path

1. Product engineering owner.
2. Governance owner.
3. Release captain if unresolved inside release window.

## Operational SLO Assumption

- Target CI pass stability for UX gates: 99%.

## Monitoring

- Weekly drift job emits `drift_report.json`.
- Alert on sustained score regression beyond configured threshold.
