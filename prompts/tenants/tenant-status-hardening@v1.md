# Tenant status hardening (Sprint +3)

## Objective
Implement tenant status lifecycle controls for hosted SaaS readiness, including:

- PATCH /api/tenants/{id} to set status to active or suspended.
- Provenance entry and lifecycle history on status changes.
- Route test coverage for the status change path.
- Update docs/roadmap/STATUS.json to register the Sprint +3 hardening initiative.

## Constraints
- Scope limited to tenant routes, tenant service, tests, and roadmap status.
- No policy bypasses; enforce existing ABAC policy gate.

## Evidence
- Jest route test for tenant status patch.
- Roadmap status update recorded.
