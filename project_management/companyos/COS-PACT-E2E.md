# COS-PACT-E2E — Pact-style Contract + End-to-End Cold-Start

## Goal
Prevent seam drift between CompanyOS components by introducing Pact-style consumer/provider contracts and dual-mode end-to-end tests that validate both standalone (local policy) and integrated (MC-connected) operations, including performance load tests.

## Key Outcomes
- Pact contracts covering critical headers and `/attestation` endpoint semantics.
- Cold-start E2E workflow validating standalone mode (local users/policy) and MC-integrated mode (policy fetch, evidence publish).
- k6 load test ensuring p95 ≤350ms reads and ≤700ms writes at target RPS.
- CI gating on contract, E2E, and load test thresholds with flaky test mitigations.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Pact Consumer Tests | Define expectations for CompanyOS API clients (headers, responses).
| Pact Provider Verification | Validates server responses against consumer contracts.
| E2E Harness | Spins up environment with/without MC integrations for smoke tests.
| k6 Load Suite | Exercises read/write paths to validate latency SLOs.
| CI Pipeline | Orchestrates contract, E2E, and load tests; enforces thresholds.

## Implementation Plan
### Phase 0 — Contract Scoping (Week 1)
- Identify APIs requiring contracts (login, `/attestation`, evidence publish callbacks).
- Collaborate with MC to confirm header expectations and digest/ETag semantics.

### Phase 1 — Pact Implementation (Weeks 1-2)
- Implement Pact consumer tests capturing request/response headers, payloads, and error cases.
- Build provider verification pipeline integrated with server test harness; ensure contract fixtures stored in repo.
- Add contract verification to CI with failure triage notifications.

### Phase 2 — E2E Dual-Mode Harness (Weeks 2-3)
- Create infrastructure-as-code (Terraform/k8s manifests) for standalone mode (local policy, users) and integrated mode (MC + policy fetcher).
- Automate environment bootstrap scripts to switch between modes and run smoke scenarios.
- Validate policy fetch, OPA reload, and evidence publish flows end-to-end.

### Phase 3 — Load Testing & CI Gating (Week 3)
- Author k6 scripts simulating target RPS mix; collect metrics for p95 latency and error rates.
- Integrate k6 execution into CI with threshold gating and artifact uploads (charts, raw metrics).
- Implement retry/backoff wrappers for known flaky steps with telemetry.

### Phase 4 — Documentation & Rollout (Week 4)
- Document contract update process, versioning strategy, and release checklist.
- Publish runbooks for running E2E harness locally and in CI.
- Train QA/Engineering teams on interpreting k6 reports and debugging failures.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| API contract scoping | QA/Eng + MC | 2d | None |
| Pact consumer tests | QA/Eng | 3d | Scoping |
| Provider verification | QA/Eng | 3d | Consumer tests |
| CI integration for Pact | QA/Eng | 2d | Provider verification |
| E2E harness standalone mode | QA/Eng | 4d | Pact CI |
| E2E harness integrated mode | QA/Eng + App Eng | 4d | Standalone harness |
| k6 script development | QA/Eng | 3d | Harness integrated |
| CI gating & docs | QA/Eng | 3d | Load tests |

## Testing Strategy
- **Contract**: Pact consumer/provider tests fail on any seam change.
- **E2E**: Standalone mode verifying local policy fallback; integrated mode verifying policy fetch, reload, evidence publish.
- **Load**: k6 thresholds gating builds; collect CPU/memory metrics for regression tracking.
- **Resilience**: Inject network faults between COS and MC to ensure graceful degradation (standalone fallback).

## Observability & Operations
- Metrics: `contract_test_failures_total`, `e2e_suite_duration_seconds`, `k6_threshold_breaches_total`.
- Dashboards: CI trend lines for contract stability, E2E duration, load test latencies.
- Alerts: CI failure notifications routed to QA/Engineering on contract/load regression.

## Security & Compliance
- Ensure Pact fixtures scrub sensitive data; store in version control with review.
- Restrict MC credentials used in integrated mode to limited scope and ephemeral lifetime.

## Documentation & Enablement
- Add contract testing section to QA handbook describing update approvals.
- Provide step-by-step guide for running E2E modes locally.
- Share k6 report interpretation cheat sheet with Engineering teams.

## Operational Readiness Checklist
- [ ] Pact contracts reviewed and versioned with MC stakeholders.
- [ ] E2E harness executed successfully in both modes with artifacts archived.
- [ ] k6 load test passes thresholds and publishes report to CI artifacts.
- [ ] Runbooks and documentation reviewed by QA lead.

## Dependencies
- COS-POL-FETCH and COS-EVIDENCE-PUB implemented to enable integrated mode.
- MC sandbox credentials available for contract and E2E tests.

## Risks & Mitigations
- **Flaky k6 infra**: Use fixed RPS profiles, warm-up periods, and isolate environment resources.
- **Contract churn**: Establish versioning strategy and change approval workflow with MC.

## Acceptance Criteria
- Pact tests fail on any seam change; builds blocked until updated.
- E2E suite passes for standalone and integrated modes.
- k6 load tests meet latency thresholds (≤350ms reads, ≤700ms writes) at target RPS.
- CI pipeline gates merges on contract/E2E/load test results.
