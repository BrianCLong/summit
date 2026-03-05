# SOC Control Tests

This directory encodes SOC-style security controls as testable expectations against
the Summit/IntelGraph platform's audit logging, metrics, and access-control wiring.

## Purpose

SOC 2 Type II and similar compliance frameworks require *evidence* that security controls
are in place and operating effectively. These tests bridge the gap between
"we documented the control" and "the control is provably active in the codebase."

## Controls Covered

| ID | Control | Status | Test File |
|----|---------|--------|-----------|
| SC-01 | All sensitive report views are auditable | Implemented | `sc-01-report-views-auditable.test.ts` |
| SC-02 | Auth failures are monitored via metrics | Implemented | `sc-02-auth-failures-monitored.test.ts` |
| SC-03 | Data exports produce structured audit events | Implemented | `sc-03-data-exports-audited.test.ts` |
| SC-04 | Audit log write failures are observable | Implemented | `sc-04-audit-write-health.test.ts` |
| SC-05 | WebSocket auth denials are instrumented | Implemented | `sc-05-ws-auth-denials-instrumented.test.ts` |

## How to Run

```bash
# Run all SOC control tests
npx jest tests/soc-controls/ --passWithNoTests

# Run a specific control
npx jest tests/soc-controls/sc-01-report-views-auditable.test.ts
```

## Expanding This Suite

To add a new SOC control test:

1. **Identify the control** — map it to a SOC 2 Trust Service Criterion (CC6.1, CC7.2, etc.)
   or an internal policy requirement.

2. **Create a test file** — use the naming convention `sc-NN-<short-description>.test.ts`.

3. **Encode the expectation** — the test should verify that the code path either:
   - Calls `securityAudit.*` (audit logger integration), or
   - Increments a Prometheus counter/gauge (metrics integration), or
   - Has middleware in the correct position (access control wiring).

4. **Keep tests fast** — these are structural/unit tests, not integration tests.
   Mock external dependencies (DB, Redis, etc.) and verify call patterns.

5. **Update this README** with the new control in the table above.

## Architecture

These tests verify the *wiring*, not the infrastructure. They confirm that:
- The `SecurityAuditLogger` is imported and called in the right code paths
- Prometheus metrics are defined with the correct names/labels
- Auth middleware is present on sensitive routes

They do **not** verify that Prometheus is running, that the audit database is up,
or that dashboards exist — those are infrastructure/integration concerns tested
elsewhere (see `tests/observability/` and `tests/security/`).
