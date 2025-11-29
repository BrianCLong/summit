# Sprint 7: Extensibility & Integration Platform v1

## Objective
Deliver a stable, partner-ready integration surface (versioned APIs, TypeScript SDK, webhooks, and adapter framework) so teams can extend CompanyOS/Switchboard without forking core services.

## Guiding Principles
- **Versioned contracts first**: OAS3 is the single source of truth; every public surface is behind `/v1` with clear deprecation windows.
- **Secure by default**: zero secrets in configs, HMAC signing on webhooks, and policy-gated adapter/webhook configuration.
- **Composable architecture**: adapters loaded via configuration, webhook transport decoupled from producers, SDK generated from the same spec.
- **Observability everywhere**: delivery/adapter metrics (latency, success, DLQ), audit receipts for config changes, and SDK user agent tagging.
- **Backward-compatible releases**: contract tests and changelog automation block breaking changes.

## Architecture Overview
- **Public API Surface**
  - OAS3 monorepo module validated in CI; schema modules for tenants, incidents, approvals, runbooks, metering, and timeline.
  - Versioned routing (`/v1`) with compatibility layer and deprecation headers.
  - Changelog generator diffing the last tagged spec vs. HEAD.
- **TypeScript SDK**
  - Codegen from OAS3 -> typed clients; wrapper utilities for auth (API key, token, OAuth hook points), pagination, retries, and user-agent tagging.
  - Published to internal registry; example Node script validates listing tenants/incidents/approvals.
- **Adapter Platform**
  - Config-driven adapter registry supporting Identity (OIDC/OAuth/SCIM), Storage/Notary, Payments, Alerts/Notifications.
  - Reference adapters: Okta OIDC, Slack webhook, PagerDuty/email, Stripe-like payments, S3-compatible storage.
  - Policy layer (OPA/ABAC) governs who can configure/use adapters per tenant/region; secrets pulled from secret manager only.
- **Webhooks & Event Delivery**
  - Event model with topics for incidents, approvals, runbooks, and billing usage; envelope includes tenant + correlation IDs with minimal PII.
  - Subscription model (URL, events, auth, retry policy) with HMAC signing, exponential backoff, DLQ, and delivery metrics.
  - Switchboard UI surfaces subscriptions, recent deliveries, and triage guidance.

## Workstreams & Deliverables
1. **OAS3 Hardening & Versioning**
   - Normalize schemas and error shapes; introduce `/v1` routing and deprecation headers.
   - CI: lint, bundle validation, and breaking-change detection; generate Postman collection.
2. **Contract Tests & Guardrails**
   - Contract tests per public endpoint asserting status codes/payloads; compatibility checks fail CI on breaking changes.
   - Automated changelog notes between releases.
3. **TypeScript SDK v1**
   - Codegen clients + hand-tuned wrappers (auth, pagination, retries, user agent tagging).
   - Example Node integration and Switchboard frontend swap to prove viability.
4. **Adapter Framework & References**
   - Define adapter interfaces + config schemas; load via configuration without code changes.
   - Reference adapters with minimal happy-path tests; metrics for failures/latency.
5. **Webhooks Platform**
   - Event schema/versioning; subscription CRUD with OPA guardrails and secret handling.
   - Delivery service with retries, HMAC signing, DLQ, metrics, and operator UI for debugging.
6. **Partner Integration Story**
   - Integration guide covering API, SDK, webhooks, adapters, and reference workflows (Slack/PagerDuty, Stripe-like billing).

## Milestones (2-week sprint cadence)
- **Week 1**
  - Finalize `/v1` spec, enable CI validation and breaking-change checks.
  - Implement SDK codegen pipeline and publish internal snapshot; ship example Node script.
  - Define adapter interfaces/config schemas; build Slack webhook + S3 adapters; stub Stripe-like payments adapter.
  - Stand up event topics and webhook delivery skeleton with signing + retries.
- **Week 2**
  - Add contract tests and changelog automation; wire Switchboard feature to SDK.
  - Finish reference adapters (Okta OIDC, PagerDuty/email); add metrics + minimal tests.
  - Complete webhook UI surfacing subscriptions/deliveries; document triage runbook.
  - Publish integration guide and reference integration walkthroughs; run internal demo.

## Success Metrics & SLOs
- Webhook first-attempt p95 < 2s; delivery error rate < 1% under load with retries.
- 100% adapter/webhook config changes emit policy-gated receipts; zero secrets in logs/config bundles.
- SDK adopted by ≥1 internal integration and ≥1 Switchboard feature; requests tagged with SDK user agent.

## Risks & Mitigations
- **Spec drift**: Mitigate with CI breaking-change checks and gated merges.
- **Adapter misconfiguration**: Enforce OPA policies and secret manager integration; emit audit receipts.
- **Webhook delivery failures**: DLQ + replay tooling; operator UI with per-attempt logs and metrics.
- **Performance regressions**: Load testing for webhook service; telemetry dashboards for latency/error budgets.

## Validation & QA Plan
- Contract and integration tests aligned to OAS3; fixture-driven webhook delivery tests (success, retry, DLQ, signature verification).
- Adapter tests per reference implementation; SDK unit tests for wrappers and pagination/retry helpers.
- Playbook-driven manual QA: subscription CRUD, adapter swap via config, SDK-powered UI path, and reference integration demos.

## Post-Ship Readiness
- Runbooks: onboarding adapters safely, webhook failure triage, SDK upgrade guidance.
- Observability dashboards for adapter/webhook metrics and SDK-tagged traffic.
- Release artifacts: versioned OAS3, generated SDK docs/README, Postman collection, integration guide.
