# Security Epics Delivery Plan

This plan operationalizes the nine security epics provided by the requestor and maps them into deliverable workstreams for Summit/IntelGraph. It emphasizes production readiness, shared controls, and measurable KPIs so that delivery teams can sequence and verify the program.

## Guiding principles
- **Centralize enforcement**: Prefer shared middleware, policy engines, and platform services to avoid divergent implementations.
- **Evidence-first**: Every control ships with logging, metrics, and dashboards to prove coverage and facilitate tuning.
- **Reduction before addition**: Remove dead surfaces and dependencies before adding new mitigations.
- **Short-lived trust**: Default to short-lived tokens, scoped credentials, and just-in-time access with auditable approvals.
- **Multi-tenant safety**: Assume hostile neighbors; enforce per-tenant scoping, quotas, and isolation at every tier.

## Epic 1 — Attack Surface Reduction
- Inventory all public/admin endpoints and ports via automated discovery (CI job + runtime scans) and publish the surface area KPI dashboard.
- Decommission unused/legacy routes after a 30-day zero-traffic proof (access logs + synthetic probes) with changelog entries.
- Place admin surfaces behind SSO + MFA + IP/geo filters; codify via gateway policies and OPA bundles.
- Enforce strict CORS/CSRF/secure-cookie defaults in shared middleware and validate with smoke tests.
- Standardize input validation/output encoding through shared libraries; ban service-specific custom auth.
- Rate limit per endpoint/tenant/IP using a tiered policy; integrate WAF signatures for common exploits and SSRF-safe metadata endpoints.
- Prune unused packages, pin versions, and track surface-area KPI deltas per release.

## Epic 2 — Identity & Access Under Siege
- Enforce MFA everywhere internally; require phishing-resistant MFA for privileged roles with device posture checks.
- Implement just-in-time privileged access with approvals, expirations, and audit trails; remove long-lived tokens in favor of short-lived rotating credentials.
- Centralize RBAC/ABAC in the policy engine; ship “why denied” introspection and quarterly access reviews with auto-revoke for non-responses.
- Add anomaly alerts for impossible travel, token reuse, and brute force; maintain break-glass accounts with constrained scope and heavy logging.

## Epic 3 — Data Exfiltration Defense
- Classify data fields (PII tiers) at the schema level; enforce redaction at log/analytics ingestion with CI regression checks.
- Apply outbound egress allowlists per service/connector; add DLP detectors for export volume anomalies and scraping patterns.
- Introduce per-tenant export quotas and approval gates for high-risk exports; encrypt/tokenize sensitive fields with scheduled key rotation.
- Restrict production data in non-prod via masking/tokenization; maintain tamper-evident audit logs for sensitive access and rapid revoke pathways.

## Epic 4 — Abuse & Fraud Controls
- Define abuse taxonomy (signup, scraping, spam, payments, API abuse) and instrument detections with bot defenses and device signals.
- Apply per-tenant/user quotas and velocity limits on invites, exports, password resets, and other high-cost actions; use risk scoring for step-up auth.
- Deploy honeytokens/canaries to detect scanning and stuffing; build abuse ops console capabilities for quarantine, throttling, and shadow bans.
- Add payment fraud controls (retry rules, chargeback workflows, evidence capture) and track containment KPIs.

## Epic 5 — Secure SDLC & Supply Chain
- Enable SAST, dependency/licensing scans, SBOM generation, and secrets scanning in CI with blocking thresholds.
- Require code owners and mandatory reviews for security-sensitive modules; adopt signed builds/artifact provenance with verification at deploy.
- Pin dependencies with automated update PRs; maintain vuln response SLAs and fuzz testing for parsers/untrusted boundaries.

## Epic 6 — Runtime Detection & Response
- Centralize security logging with normalized fields (user, tenant, IP, device, request_id) and immutable audit logs for admin/sensitive actions.
- Build detection rules for privilege escalation, mass exports, and unusual API patterns; route alerts with severity rubrics and response SLAs.
- Provide automated containment (token revoke, session kill, integration disable, throttling) and forensic timeline tooling.
- Run quarterly breach tabletops including Legal/Comms/Support and instrument time-to-innocence/MTTD/MTTR metrics.

## Epic 7 — Multi-Tenant Isolation Hardening
- Enforce tenant scoping at the data access layer via non-bypassable middleware; add automated cross-tenant access tests.
- Introduce per-tenant resource caps (CPU, jobs, exports, API calls) and isolate high-risk workloads into dedicated worker pools.
- Apply row-level access checks for sensitive objects and per-tenant encryption boundaries where justified; enable tenant quarantine mode with observability.
- Ensure admin tooling honors tenant scoping and idempotency/replay protection for tenant-triggered writes; target zero cross-tenant incidents.

## Epic 8 — Integrations as Attack Vectors
- Require signed webhooks with replay protection; enforce connector scopes via the policy engine and tenant-level allow/deny lists.
- Add per-connector observability for failures/anomalies/volume spikes; sanitize and validate inbound payloads with quarantine for malformed data.
- Use secrets vault integrations with rotation and short-lived tokens; provide kill switches to disable connectors quickly with audit logging.
- Certify partner integrations with automated checks and maintain an incident playbook for containment, notification, and key rotation.

## Epic 9 — Security Governance That Forces Debt Burn
- Maintain a top-10 security risk register with owners and deadlines and enforce a sprint-level security debt budget until targets are met.
- Operate an exception registry with compensating controls and expirations; add non-negotiable release gates for Tier-0/1 systems.
- Require Sev-1/2 postmortems with systemic fixes; publish monthly security scorecards and run quarterly red-team style exercises.
- Keep a “delete list” of risky legacy components and retire at least one/month; reward teams for measurable risk reduction.

## Execution cadence
- **Wave 0 (2 weeks):** Surface inventory, dependency pruning, and control baselines (CORS/CSRF/cookies/WAF/rate limits).
- **Wave 1 (4–6 weeks):** Centralized auth/policy, data classification + redaction, per-tenant quotas, logging normalization, and SDLC gates.
- **Wave 2 (6–8 weeks):** JIT access, short-lived tokens, egress allowlists, DLP detectors, abuse console, integration hardening.
- **Wave 3 (ongoing):** Detection tuning, automated containment, tenant quarantine, red-team/tabletops, and monthly debt burn-down.

## Forward-leaning enhancements
- **Policy-as-code federation:** Use signed OPA bundles with supply-chain attestations to guarantee consistent enforcement across services.
- **Adaptive risk scoring:** Combine device posture, geo-velocity, and behavioral baselines to trigger step-up auth or throttling dynamically.
- **Tamper-evident provenance:** Extend the provenance ledger to cover security control changes, producing immutable audit trails and replayable timelines.
