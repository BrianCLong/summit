# Identity & Policy Program — ABAC/OPA with Step-Up Authentication

## Program Summary

The Identity & Policy initiative will deliver a production-ready attribute-based access control (ABAC) platform backed by Open Policy Agent (OPA) and WebAuthn step-up authentication. The program centralizes authorization logic, codifies policies, and ensures sensitive actions require phishing-resistant verification. The MVP spans six weeks and targets a fully operational service integrated with Summit's core applications.

## Mission & Objectives

- **Mission:** Centralize attribute-based access control with policy-as-code while introducing WebAuthn step-up challenges for sensitive actions to deliver provable enforcement and auditability across Summit services.
- **Objectives:**
  - Provide a low-latency authorization service with consistent decisions across tenants and regions.
  - Reduce policy drift by enforcing signed, unit-tested bundles with automated promotion pipelines.
  - Protect high-risk operations through adaptive step-up authentication and auditable challenge lifecycles.
  - Supply SDKs and runbooks so product teams can self-serve integrations without bespoke policy logic.

## Scope (MVP — 6 Weeks)

- **Attribute Service (read-only cache):** Aggregates IdP claims, organizational metadata, device posture, and data-tagging labels. Supports per-attribute TTL, cache invalidation, and provenance metadata.
- **OPA bundle with core guardrails:** Implements tenant isolation, data residency, least-privilege, action classification, and obligations (e.g., require step-up, attach justifications).
- **Step-up authentication middleware:** Issues WebAuthn challenges for protected routes, handles signed-nonce replay protection, and logs lifecycle events for audit correlation.
- **Integration enablement:** Go and TypeScript SDKs, reference app, migration playbook, operational runbooks, and policy test harness.

### Out of Scope (MVP)

- Continuous risk scoring engine (tracked as Track B).
- Device posture attestation beyond ingestion of upstream signals.
- Legacy SAML IdP integrations (OIDC primary, with SAML connector backlog).

## Deliverables

- **Attribute Service:** Hardened cache API with attribute provenance metadata, TTL tooling, dashboards, and operational runbook.
- **OPA Policy Bundles:** Signed, unit-tested Rego packages for tenant isolation, data residency, least privilege, and obligations.
- **SDKs (`isAllowed(subject, action, resource)`):** Go and TypeScript clients with decision tracing, retries, local caches, and helper utilities for step-up orchestration.
- **Policy Test Suite:** Golden decision fixtures, coverage dashboards, and CI automation covering lint, unit, and regression tests.
- **Operational Runbooks:** Attribute sync recovery, bundle signing/rotation, WebAuthn escalation, and weekly evidence attachment checklist.

## Architecture Overview

The program introduces a layered architecture:

1. **Attribute Service:**
   - Sync workers ingest user, group, org, and resource tags from IdP APIs, CMDB, and data catalog via event streams.
   - Cached attributes stored in Redis Cluster (primary) with DynamoDB durability; TTL defaults 5 minutes, override per namespace.
   - Exposes read-only GraphQL and REST endpoints with versioned schemas; supports on-demand refresh via signed webhook.
2. **Policy Engine (OPA):**
   - OPA sidecar per service or centralized decision API (OPA on Kubernetes with Envoy external authorization).
   - Bundles built via GitOps pipeline (Rego lint, unit tests, coverage, signature). Served via artifact registry with Cosign signatures.
3. **Step-Up Middleware:**
   - Runs as a shared service (Node/Go) or library to intercept protected actions, orchestrate WebAuthn ceremonies, and enforce obligations from OPA decisions.
   - Uses Summit Identity Provider for WebAuthn credential management and telemetry.
4. **SDKs & Integration Points:**
   - Lightweight clients for Go (server-side) and TypeScript (Node/Edge) with retry, caching, and decision tracing.
   - Sample app demonstrates attribute sync, OPA decision query, and WebAuthn enforcement end-to-end.

```
[Client] → [Gateway w/ Step-Up Middleware] → [AuthZ Gateway (OPA)] ↔ [Attribute Service Cache]
                                                       ↘
                                                        [WebAuthn Attestation Service]
```

## Attribute Service Design

- **Sources:** OIDC IdP (Okta/Azure AD), HRIS org hierarchy, data catalog tags, device inventory.
- **Data Model:** Subject (user/service), action, resource classification, obligations. Attributes stored as `{ namespace, key, value, source, collected_at, ttl_expires_at }`.
- **Sync Strategy:**
  - Initial bootstrap via bulk import.
  - Change data capture using IdP SCIM webhooks and Kafka topics; workers update cache and emit metrics.
  - Drift protection through TTL expiration, reconciliation jobs, and manual bust endpoints with RBAC.
- **Observability:** Emit Prometheus metrics (`attribute_freshness_seconds`, `cache_hit_ratio`), structured logs with trace IDs, and distributed tracing integration.
- **Resiliency:** Multi-AZ Redis with replica promotion, fallback to eventual-consistent DynamoDB queries when cache miss occurs.

## Policy Authoring & Bundling

- **Structure:** `policies/abac/` repo with modules for tenant isolation, residency, obligations, and exceptions.
- **Workflow:**
  1. Developer opens PR with Rego changes and golden test updates.
  2. CI runs `opa fmt`, `opa test`, coverage (`opa test -c`) with threshold ≥90%, and Conftest lint.
  3. Bundle built with version metadata, signed using Cosign key stored in HSM-backed KMS.
  4. Artifact pushed to registry; deployment pipeline promotes through staging → canary → production.
- **Change Management:** Feature flags per bundle version, automated rollback on decision error budget burn, weekly policy diff reports.
- **Example Policy Snippet:**

```rego
package authz.allow

default allow = false

allow {
  input.subject.tier == "employee"
  input.resource.tenant == input.subject.tenant
  not requires_step_up
}

requires_step_up {
  input.action in step_up_actions
}

obligations := {"step_up": true} {
  requires_step_up
}
```

## Step-Up Authentication Flow

1. Client requests protected action.
2. Service queries OPA (`POST /authorize`) with subject, action, resource.
3. If obligations include `step_up`, middleware issues WebAuthn challenge via `/webauthn/challenge`.
4. Client performs ceremony using platform authenticator; signed assertion returned.
5. Middleware verifies signature, nonce freshness, and attestation trust root; logs challenge lifecycle (requested, satisfied, failed).
6. Upon success, action proceeds; failures create security events routed to SIEM with replay detection.

- **Replay Protection:** Challenge IDs stored with nonce hash in Redis for 5 minutes; reused responses rejected.
- **Escalation Flow:** After repeated failures, route to manual verification runbook with support contact and SLA.

## Interfaces & Contracts

- **REST/GRPC:**
  - `POST /authorize` request payload:
    ```json
    {
      "subject": {
        "id": "user-123",
        "tenant": "acme",
        "attributes_version": "v2025-09-28"
      },
      "action": "datasets.read_sensitive",
      "resource": {
        "id": "dataset-42",
        "tenant": "acme",
        "classification": "restricted"
      },
      "context": { "device_posture": "compliant", "ip_geo": "US-VA" }
    }
    ```
    Response:
    ```json
    {
      "allow": true,
      "reason": "Tenant isolation satisfied",
      "obligations": { "step_up": true },
      "decision_id": "dec-9f27",
      "policy_version": "2025.09.1"
    }
    ```
  - `GET /subject/:id/attributes` returns aggregated attribute payload with `collected_at`, `source`, and TTL metadata.
  - GRPC mirrors REST schema with protobuf definitions in `proto/identity/authorization.proto`.
- **SDK Responsibilities:** Local LRU cache (60s), request signing, automatic retries with jitter, distributed tracing instrumentation, metrics emission (`decision_latency_ms`). Primary helper method: `isAllowed(subject, action, resource, context?)` returning `{ allow, obligations, decisionId, policyVersion }` and raising explicit error types for policy, network, or step-up obligations.

## Service Level Objectives

- **Decision Latency:** p95 < 15 ms for co-located services and < 50 ms for cross-zone requests; track via synthetic decision probes.
- **Availability:** 99.99% monthly availability for the authorization decision surface (Attribute Service + OPA gateway + step-up middleware).
- **Step-Up Success:** ≥ 98% challenge completion rate excluding user cancellations; alert on three consecutive drops below target.
- **Attribute Freshness:** 99% of high-risk attributes refreshed within 2× configured TTL.

## Definition of Ready (DoR)

- Canonical **data classification labels** documented, in CMDB, and referenced by policy taxonomy.
- **Protected action catalog** mapped to risk tiers and required assurance level, reviewed by IAM + security architecture.
- **IdP schema mapping** (user, group, org units) signed off by IAM and security engineering; sample payloads stored in fixtures repo.
- **Signing keys** for bundle attestations generated and escrowed with key management SOP documented.

## Definition of Done (DoD)

- Sample application enforces ABAC decisions via the OPA SDK, including decision logging and policy version tagging.
- Protected routes require WebAuthn step-up when policies demand elevated trust; audit logs demonstrate ceremony lifecycle.
- Policies ship with unit, regression, and golden decision tests achieving ≥90% coverage and passing linting gates.
- Attribute service dashboards (freshness, latency, error rate) and synthetic probes operational with alert routing.
- Operational runbooks for attribute sync, bundle signing/rotation, and step-up incident response approved by Security & SRE.

## Implementation Timeline (6-Week MVP)

| Week     | Focus                        | Key Milestones                                                                    |
| -------- | ---------------------------- | --------------------------------------------------------------------------------- |
| 0 (Prep) | Program kickoff              | DoR artifacts confirmed, ADR draft opened, baseline dashboards stubbed            |
| 1        | Attribute service foundation | Redis/Dynamo schemas, ingestion workers for IdP + org metadata, health checks     |
| 2        | Policy pipeline              | Rego repo bootstrap, lint/test CI, initial tenant isolation & residency policies  |
| 3        | Step-up middleware           | WebAuthn service integration, challenge API, audit logging, synthetic probes      |
| 4        | SDKs & sample app            | Go/TS SDK alpha, sample app wiring, golden tests for critical policies            |
| 5        | Hardening & SLO validation   | Load tests, chaos drills, replay protection verification, alert tuning            |
| 6        | Launch readiness             | Runbooks finalized, security review, evidence bundle assembled, prod rollout plan |

## Testing & Validation Strategy

- **Policy Tests:** Unit tests per module, decision table regression tests, and contract tests with sample attribute payloads.
- **Integration Tests:** Step-up middleware integration in CI using virtual authenticators; verifies challenge issuance, replay rejection, and audit logs.
- **Performance Tests:** k6/Vegeta load tests hitting `/authorize` with latency budget verification; synthetic probes for cross-zone scenarios.
- **Security Testing:** Static analysis (Semgrep) for policy repo, pen test focus on escalation flow, red-team exercises on attribute tampering.
- **Acceptance Tests:** Sample app scenario matrix covering allow, deny, step-up required, and attribute-expired fallback.

## Observability & SLO Instrumentation

- **Metrics:** Decision latency histograms, step-up challenge success/failure counts, attribute freshness, bundle version adoption, error budgets.
- **Tracing:** OpenTelemetry spans linking client request → OPA decision → WebAuthn ceremony with `decision_id` for correlation.
- **Logging:** Structured JSON with subject anonymization, policy version, obligations, and replay outcomes.
- **Dashboards:** Grafana boards for SLOs, synthetic probe health, bundle distribution; alert thresholds aligned with SLO error budgets.

## Dependencies & Assumptions

- **Identity Provider Integrations:** Okta/Azure AD connectors and SCIM webhooks provisioned with necessary scopes prior to Week 1.
- **WebAuthn Platform Support:** Summit Identity Provider operates the WebAuthn attestation service with production-grade HSM-backed credential storage.
- **Infrastructure Tooling:** Shared Redis, DynamoDB, Kafka, and Kubernetes clusters sized for projected QPS with capacity reservations.
- **Observability Stack:** Prometheus, Loki, and Grafana tenants ready for new metrics/log streams and SLO alerting rules.
- **Secrets Management:** KMS keys and Cosign signing material generated, access policies approved, and rotation windows scheduled.
- **Partner Team Alignment:** Downstream product teams commit integration resources in Weeks 4–6 for SDK adoption and rollout readiness.

## Security Gates & Compliance Controls

- Policy lint + coverage ≥90% enforced via CI; failing checks block merge.
- WebAuthn challenge flow implements signed nonces, replay protection, device binding, and rate limits.
- Bundles signed, verified on load, and rotated using Cosign; failures trigger automated rollback and PagerDuty alert.
- Access to signing keys restricted via hardware-backed MFA; audit logs piped to centralized SIEM.
- Privacy review ensures attribute storage complies with residency requirements and data minimization principles.

## Team & Stakeholder Ownership

- **Program Lead:** Identity & Policy PM accountable for delivery milestones and risk tracking.
- **Identity Engineering:** Builds and operates the attribute service, WebAuthn middleware, and SDKs.
- **Security Architecture:** Authors policies, reviews ADRs, and drives threat modeling plus pen test remediation.
- **Site Reliability Engineering:** Owns observability, SLO governance, chaos drills, and on-call readiness.
- **Product Operations:** Coordinates evidence packs, kickoff checklist completion, and release communications.
- **Developer Enablement:** Maintains sample app, documentation, and internal training workshops.

## Operational Runbooks & Support Model

- **Attribute Sync Runbook:** Covers ingestion failure triage, manual cache bust, TTL adjustments, and fallback queries.
- **Policy Bundle Rotation:** Step-by-step for signing, verifying, promoting, rolling back, and tracking versions.
- **Step-Up Escalation:** Handling repeated failures, manual verification workflow, customer communication templates, and SLA targets.
- **On-Call Playbooks:** PagerDuty rotations for Policy Platform and Identity Engineering with shared tooling.

## Change Management & Communication Cadence

- **Stand-Ups & Syncs:** Daily engineering stand-up; twice-weekly architecture + security sync for policy reviews.
- **Status Reporting:** Weekly program status email with evidence attachments (ADR link, dashboard screenshot, release notes, policy diff, synthetic probe summary).
- **Change Advisory:** Policy changes require CAB approval with regression evidence and rollback plan documented.
- **Stakeholder Reviews:** End-of-week executive readout covering SLO burn rates, open risks, and launch blockers.
- **Incident Communications:** WebAuthn or policy incidents follow the Security Incident Response Plan with communications templates from the escalation runbook.

## Evidence & Reporting

- **ADR-ABAC:** Architectural decision record capturing design rationale, threat model deltas, and residual risks.
- **Policy Coverage Report:** Automated export from CI with thresholds and module-level breakdown.
- **Weekly Status Attachments:** ADR link, dashboard screenshots, release notes, policy diff summary, synthetic probe results.
- **Pen Test Notes:** Documented findings and remediation timelines for WebAuthn escalation flow.

## Environments & Deployment Strategy

- **Development:** Local and shared dev clusters with feature-flagged bundles; CI enforces lint/tests before bundle publishing.
- **Staging:** Mirrors production topology with synthetic probes and replay testing; required for sign-off prior to canary.
- **Canary:** Small tenant subset with automated rollback on decision error budget burn or WebAuthn failure spikes.
- **Production:** Gradual rollout by tenant cohort with real-time dashboards and PagerDuty war room for first 48 hours.
- **Disaster Recovery:** Cross-region standby OPA cluster and attribute cache replication tested via quarterly failover drills.

## Risks & Mitigations

- **Attribute Drift:** TTL enforcement, reconciliation jobs, and alerting on stale data >2× TTL; manual override process documented.
- **Policy Regressions:** Golden decision fixtures, staged rollout with canary bundles, automated diff reviews.
- **Step-Up Fatigue:** Progressive profiling UX, adaptive risk scoring (Track B input), and admin override with approval workflow.
- **Operational Overload:** Runbooks, clear ownership, and SRE pairing during first two on-call rotations.

## Track B (Post-MVP Explorations)

- **Continuous Risk Scoring:** Fuse device posture, geo-velocity, anomaly detection, and behavior signals to dynamically adjust obligations.
- **Context-Aware Policies:** Extend schema to include session age, trust score, and transaction value; build policy patterns for adaptive assurance levels.
- **Device/Posture Integrations:** Intune/Jamf connectors, Browser isolation signals, API for third-party risk providers.

## Kickoff Checklist

- ✅ Confirm DoR artifacts exist, versioned, and linked in backlog.
- ✅ Open ADR PR and tag Security, SRE, and Product Ops reviewers.
- ✅ Build day-1 dashboards & SLO monitors; configure alert thresholds and synthetic probes.
- ✅ Deploy synthetic probes before first production rollout and validate alerting paths.
- ✅ Schedule security design review, policy lint coverage review, and WebAuthn readiness assessment.
- ✅ Create merge-readiness tracker ensuring CI gates (lint, coverage, bundle signing) stay green.
- ✅ Attach weekly evidence packet (ADR link, dashboard screenshot, release notes, policy diff) to status reports.

## Merge Readiness Notes

- Ensure CI gates cover policy lint, coverage, security scanning, and bundle signing verification; set blocking status checks.
- Verify WebAuthn middleware enforces replay protection, rate limits, telemetry logging, and SOC alert routing.
- Confirm evidence attachments (ADR link, dashboard screenshot, release notes, policy diff) ahead of weekly status reviews.
- Produce launch readiness packet summarizing SLO burn rates, open risks, mitigation owners, and rollback criteria.
