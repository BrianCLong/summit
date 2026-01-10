# CompanyOS Test Strategy

## Goals and principles

- Ship quickly with confidence through fast, layered feedback.
- Enforce multi-tenant isolation and policy/approval controls at every layer.
- Make results actionable with rich diagnostics, ownership, and trend visibility.

## Test pyramid and tooling

- **Unit (60–65%)**: deterministic logic and guardrails; mutation sampling on hot paths. _Tooling:_ Jest/Vitest or pytest, mutation testing (Stryker), static mocks for I/O.
- **Contract (10–15%)**: OpenAPI/GraphQL schemas enforced via semantic diffs; consumer-driven contracts for internal calls. _Tooling:_ Pact, Schemathesis, OpenAPI validators.
- **Integration (15–20%)**: service + datastore boundaries, feature-flag variants, policy/approval engines with real migrations. _Tooling:_ Testcontainers/localstack/docker-compose, MSW/WireMock for edges.
- **E2E (5–10%)**: thin, business-critical flows only. _Tooling:_ Playwright/Cypress with seeded tenants and trace collection.
- **Non-functional**: k6/Locust for perf with SLO gating; security via Semgrep/CodeQL, OWASP ZAP, Snyk/OWASP Dependency-Check, gitleaks/trufflehog.

## Critical E2E journeys (Given/When/Then)

1. **Tenant provisioning + SSO hookup**: Given a new tenant and IdP metadata; When SSO is configured and first login occurs; Then tenant-scoped resources are created and the user lands in an empty workspace.
2. **Workspace creation (isolated)**: Given tenant A and tenant B; When each creates a workspace; Then data, secrets, and search never cross tenants.
3. **Policy acknowledgment gate**: Given a user with pending policy acknowledgment; When they attempt sensitive actions; Then the action is blocked until acknowledgment is recorded.
4. **Approval workflow (two-level)**: Given a high-risk change requiring dual approval; When submitted and approved by two distinct approvers; Then the change applies and an immutable audit event is stored.
5. **Role change enforcement**: Given an admin downgrades a user; When the user refreshes session; Then least-privilege permissions apply immediately and cached tokens are invalidated.
6. **Data upload + schema validation**: Given a CSV/JSON ingest; When upload occurs; Then schema validation runs, failures surface to the user, and only valid rows persist.
7. **Search + faceting at scale**: Given indexed data; When the user performs filtered search; Then results are correct, paginated, and meet latency SLOs.
8. **AI/copilot action execution**: Given a generated action plan; When the user confirms; Then actions execute in order, side effects are recorded, and rollback hints are provided.
9. **Export with redaction**: Given tenant data with PII; When export is requested; Then PII is redacted per policy and access is logged.
10. **Session timeout + re-auth**: Given idle session exceeds timeout; When the user resumes; Then they are prompted to re-auth and drafts are preserved.
11. **Incident escalation path**: Given a failing background job; When thresholds are crossed; Then alerts fire, runbooks link in UI, and on-call can replay idempotently.

## Contract testing (schema-based APIs)

- Canonical OpenAPI/GraphQL schemas versioned; breaking semantic diffs fail CI.
- Consumer-driven contracts via Pact for internal services; provider states include tenant headers and policy gates.
- Schemathesis fuzzing covers negative cases, tenant header enforcement, idempotency keys, and pagination invariants.

## Performance test plan

- **Key endpoints**: auth/token issuance, search, ingest/upload, approval submission, policy acknowledgment, AI action execution, exports.
- **Profiles**: warm-up (5m), steady (30m), spike (3–5× p95 load for 5m), nightly soak (2–4h).
- **Concurrency targets**: search 200 rps baseline (3× spike), ingest 50 rps (3× spike), auth 100 rps (3× spike).
- **SLO gates**: p50/p95/p99 latency, <0.5% error rate, CPU/mem saturation, DB slow queries, queue lag; k6 thresholds wired to CI quality gates.

## Security testing

- **SAST**: Semgrep/CodeQL on every PR; block on high/critical.
- **DAST**: OWASP ZAP baseline per PR preview; full scan nightly with auth flows scripted.
- **Dependencies**: Snyk/OWASP Dependency-Check; auto-fix PRs; block on criticals.
- **Secrets**: gitleaks/trufflehog in CI.
- **AuthZ cases**: missing/altered tenant-id headers, JWT tenant mismatch, role downgrades invalidating caches, bypass attempts on approval/policy gates, replay protection with idempotency keys, CSRF on state-changing routes.

## Quality gates

- **PR blocking**: unit + contract + integration, lint/format, schema diff, SAST, dependency scan, coverage on changed lines, migration lint, critical perf k6 thresholds, no new high/critical vulns.
- **PR warnings**: flaky detector, minor perf regression (<5%), non-critical vuln with remediation plan, documentation drift hints.
- **Release blocking**: all PR gates plus full e2e suite, full DAST scan, perf soak within SLOs, backup/restore drill, migration dry-run, security attestations, regression suite for approvals and policy acknowledgment.

## Test data strategy

- Seed deterministic tenants (e.g., `tenant-alpha`, `tenant-beta`) with isolated fixtures; minimal yet realistic volumes.
- Generate ephemeral tenants per test with unique IDs and automatic teardown; ensure storage/index prefixes per tenant.
- Production snapshots pass through irreversible tokenization/masking; no PII in lower envs.
- Versioned fixtures aligned with schemas; contract tests validate seeds.
- Synthetic edge cases: large payloads, malformed inputs, expired tokens, policy states (ack vs pending), approval chains.
- Tag data with trace/test IDs for correlation and debugging.

## Regression suites

- **Approvals**: create/approve/reject/cancel, dual-approval paths, delegation, audit log verification, rollback behavior.
- **Policy acknowledgment**: required-on-first-login, periodic re-ack, block on pending, audit entries, locale/versioned content.

## Reporting (actionable)

- Publish JUnit/Allure with failure clustering, owner mapping, and links to traces/logs/dashboards.
- Trend graphs for latency/error rates and flaky tests; multi-tenant violations highlighted with offending test IDs and resource keys.
- Distribute CI artifacts plus Slack/email digests with “top regressions” and “new risks”.

## Multi-tenant isolation coverage

- Enforce tenant headers/mTLS claims in every API test; snapshot isolation checks for DB.
- Chaos runs with parallel tenant workloads asserting zero cross-tenant reads/writes/search results; bucket/index prefixes must be required and validated.

## Process & cadence

- **Per-commit/PR**: unit + contract + targeted integration, smoke e2e, SAST/deps.
- **Nightly**: full e2e, DAST baseline, mutation sample, perf steady + spike, flaky quarantine review.
- **Weekly**: soak tests, backup/restore and disaster recovery drills, access review scenarios.

## Future-facing enhancements

- **Property-based testing for policy/approval engines**: generate policies and approval chains to prove invariants (no bypass, dual-approval requirements, monotonic audit logs) using fast-check or hypothesis; integrate as part of unit/contract layers.
- **Differential fuzzing for authZ middleware**: compare middleware decisions against a reference model (OPA or formal rules) under fuzzed inputs (headers, JWT claims, feature flags) to detect divergence and tenant leakage.
- **Test impact analysis + adaptive load testing**: select tests based on dependency graphs and recent changes; replay production traffic shapes (privacy-safe) in k6 to adapt concurrency and catch regressions earlier.
- **Autonomous guardrails**: pipeline bots auto-open defects with repro traces, suspected commits, and suggested fixes when quality gates fail; include ownership routing and SLA reminders.
