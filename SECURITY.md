# Security Policy

This document outlines the security policy for the Summit (IntelGraph) platform.

## Threat Model

### Scoped Assets

- **Application surfaces**: public web UI, APIs (GraphQL/REST/gRPC), mobile endpoints, background workers, scheduled jobs.
- **Data stores**: PostgreSQL (PII and operational data), Neo4j/graph indexes, object storage (artifacts, uploads, models), Redis caches, message queues/event buses.
- **Identity & access**: SSO (OIDC/SAML), service accounts, API keys/tokens, secrets management (Vault/KMS), RBAC/ABAC policy engine.
- **Infrastructure**: Kubernetes clusters, container images, CI/CD runners, build artifacts, Terraform/Helm/IaC state, ingress/load balancers, CDN/edge caches.
- **Observability & security tooling**: logs/metrics/traces, SIEM/SOAR connectors, provenance ledger, audit trails.
- **Third-party dependencies**: npm/pnpm packages, Rust crates (Cargo), Python packages, OS packages, external AI/model services.

### Trust Boundaries

- **External users ↔ Edge**: public internet to CDN/WAF/ingress. Enforce TLS, WAF rules, rate limiting, bot detection.
- **Edge ↔ App tier**: ingress to services. Apply mutual TLS/service identity, authZ via gateway/policy checks.
- **App tier ↔ Data tier**: services to databases/queues/caches/object storage. Enforce network policies, least-privilege credentials, encryption in transit/at rest.
- **CI/CD ↔ Runtime**: build pipelines to registries/clusters. Sign artifacts (SLSA/COSIGN), verify signatures and provenance before deploy.
- **Internal services ↔ External dependencies**: outbound calls to third-party APIs/LLM providers. Use egress controls, allow-lists, and secret scoping.

### Primary Threats

- **AuthZ/AuthN flaws**: privilege escalation, token replay, missing policy enforcement, JWT tampering.
- **Data security**: PII exfiltration, data leakage via logs/telemetry, insecure object storage ACLs, injection leading to data corruption.
- **Supply chain**: dependency typosquatting, compromised build artifacts, unsigned containers, malicious IaC modules.
- **Application attacks**: injection (SQL/NoSQL/GraphQL), SSRF, XSS, CSRF, deserialization issues, path traversal in uploads, LLM prompt injection.
- **Availability**: DDoS on APIs, resource exhaustion (queue flooding, cache poisoning), runaway jobs, noisy-neighbor in multi-tenancy.
- **Secrets & keys**: leaked tokens/keys, weak rotation, secrets in repos or images.
- **Model/AI-specific**: model poisoning, unsafe model outputs, excessive data retention in embeddings, prompt leaking via context windows.

### Mitigations

- **Identity & access**: enforce SSO, short-lived tokens, mTLS between services, centralized policy-as-code (OPA/Conftest) with deny-by-default, role scoping, and per-tenant isolation guards.
- **Input validation & hardening**: strict schema validation on all inputs, parameterized queries, output encoding, CSP + secure headers, CSRF protection, upload scanning/quarantine, SSRF-safe HTTP clients.
- **Data protection**: encrypt in transit (TLS 1.2+/mTLS) and at rest (KMS-managed keys), field-level encryption for sensitive attributes, access logging with immutable provenance ledger, least-privilege DB roles, row/column-level security where applicable.
- **Supply chain integrity**: lockfiles + dependency pinning, automated SCA (Snyk/Trivy), signature verification for containers/artifacts (cosign/SLSA attestations), reproducible builds, vendor allow-lists, periodic SBOM generation.
- **Operational safeguards**: WAF + rate limiting + bot detection at edge, autoscaling with circuit breakers/bulkheads, resource quotas, health checks, chaos testing in staging.
- **Secrets management**: store secrets in Vault/KMS, never in repo; automatic rotation policies; scoped service accounts; detect secrets via gitleaks; restrict build logs from printing secrets.
- **AI safety**: prompt templates with guardrails, content filtering, output redaction, model-level rate limits, isolation of training data, evaluation for jailbreaks/prompt injection, provenance tagging of model outputs.
- **Monitoring & detection**: central logging to SIEM with anomaly rules, runtime security (Falco/EBPF) for containers, cloud audit logs, integrity monitoring for IaC drift, alerting tied to on-call rotations.

## Security Controls

Our CI/CD pipeline enforces a number of security controls on pull requests and release workflows.
The primary gates run via `.github/workflows/pr-quality-gate.yml` (which invokes
`.github/workflows/ci-security.yml`) and `.github/workflows/ci-verify.yml`.

- **Secret Scanning**: We use `gitleaks` to scan for hardcoded secrets in the codebase. This runs as
  a blocking gate in `.github/workflows/ci-verify.yml` and as part of the reusable
  `.github/workflows/ci-security.yml` suite.

- **Static Application Security Testing (SAST)**: We use `CodeQL` and `Semgrep` to identify potential
  vulnerabilities in our code. `CodeQL` runs for JavaScript and Python in
  `.github/workflows/ci-security.yml`, and `Semgrep` uses the `p/ci` ruleset.

- **Dependency Vulnerability Scanning**: We use `Snyk` (when enabled) and Trivy-based scans in
  `.github/workflows/ci-security.yml`, with high/critical thresholds.

- **Filesystem and Container Scanning**: We use `Trivy` to scan our filesystem and container images for vulnerabilities. This includes scanning for known CVEs in the operating system and application packages.

- **Infrastructure-as-Code (IaC) Scanning**: We use `Checkov` to scan our Terraform and Helm charts for misconfigurations. This helps to ensure that our infrastructure is deployed in a secure manner.

- **Policy Enforcement**: We use `OPA/Conftest` to enforce policies on our Kubernetes manifests. This allows us to define and enforce custom security policies for our production environment.

- **Dynamic Application Security Testing (DAST)**: We use `OWASP ZAP` to perform dynamic analysis of the running application. This is configured to run on a weekly schedule against the staging environment.

## Incident Response

### Roles & RACI

- **Incident Commander (IC)**: leads response, approves containment/eradication actions. **Responsible/Accountable**.
- **Security Operations (SecOps)**: detection, triage, forensics, SIEM/SOAR tuning. **Responsible**.
- **Site Reliability Engineering (SRE)**: service restoration, rollback/deploy fixes, capacity/traffic controls. **Responsible**.
- **Engineering DRI (per system)**: code fixes, hot patches, technical SMEs. **Responsible**.
- **Communications Lead**: stakeholder updates (internal/external), status reports, liaison with Legal/PR. **Responsible**.
- **Legal & Privacy**: breach assessment, regulatory notifications, data handling guidance. **Consulted**.
- **Product/Customer Success**: customer impact assessment and outreach. **Consulted**.
- **Executive Sponsor**: decision escalation, budget for emergency actions. **Informed/Accountable for business risk**.

### Communication Channels

- **Paging/On-call**: PagerDuty/opsgenie rotations for IC, SecOps, SRE.
- **Incident Chat**: dedicated channel (`#incidents-<id>`) with bot-created timeline and pinned runbook.
- **Video Bridge**: always-on meeting link for major incidents (SEV-1/SEV-2).
- **Email**: security@summit.ai for intake; exec-updates@summit.ai for leadership briefings.
- **Ticketing**: incident tickets in IR tracker; linked JIRA for remediation tasks; postmortem doc in shared drive.

### Severity & SLAs (time from detection)

- **SEV-1 (Critical)**: P1 security event with active exploitation or material data risk. Detect→Triage ≤15m; Containment ≤1h; Customer comms ≤1h; Full restoration ≤4h; Postmortem draft ≤48h.
- **SEV-2 (High)**: Significant exposure or high-likelihood exploit without widespread impact. Detect→Triage ≤30m; Containment ≤4h; Restoration ≤12h; Postmortem draft ≤72h.
- **SEV-3 (Medium)**: Limited scope/low-likelihood security issues. Triage ≤4h; Containment ≤24h; Restoration ≤3d; Postmortem draft ≤5d.
- **SEV-4 (Low)**: Non-urgent hygiene issues. Triage ≤2d; Planned remediation per backlog prioritization.

### Phases & Actions

- **Detection**: SIEM alerts, runtime sensors, anomaly detection, user reports. Verify fidelity, capture initial indicators (timestamps, IPs, affected services). IC assigned.
- **Triage**: Classify severity, validate scope, confirm exploitability, protect evidence (log retention snapshots, forensic disk/memory where applicable). Update incident ticket with hypothesized blast radius.
- **Containment**: Short-term (block indicators, revoke/rotate credentials, disable affected accounts, isolate pods/nodes), long-term (feature flags, traffic throttling, WAF rules, DNS/routing changes). Document steps and timestamps.
- **Eradication**: Remove malicious artifacts, patch vulnerabilities, clean persistence mechanisms, purge compromised keys/tokens, validate integrity of configs/IaC and container images.
- **Recovery**: Restore services with validated images/builds, re-enable traffic gradually (canary/blue-green), monitor for regression, re-run security tests (SAST/DAST), verify data integrity.
- **Postmortem**: Blameless report covering timeline, root cause, impact, detection gaps, control failures, and action items with owners/ETAs. Require RACI + tracking in backlog, and retro to improve playbooks and detections.

### Evidence & Logging Requirements

- Preserve logs, traces, alerts, audit records, and access tokens involved in the incident with tamper-evident storage and retention aligned to legal guidance.
- Maintain chain-of-custody for forensic artifacts; restrict access via need-to-know; record all actions in the incident timeline.

### Readiness & Drills

- Quarterly tabletop exercises for SEV-1 scenarios; monthly playbook reviews; rotating red-team/chaos drills in staging to validate containment and recovery steps.

## Reporting a Vulnerability

Please report any security vulnerabilities to our security team at `security@summit.ai`. We appreciate your efforts to disclose your findings responsibly.
