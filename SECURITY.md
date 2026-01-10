# Security Policy

This document outlines the security policy for the Summit (IntelGraph) platform.

## Threat Model

### Scoped Assets

**Primary assets (in-scope for this policy)**

- **Application surfaces**: web UI, APIs (GraphQL/REST/gRPC), mobile endpoints, background workers, scheduled jobs, internal admin consoles.
- **Data stores**: PostgreSQL (case metadata, PII), Neo4j/graph indexes, object storage (artifacts, uploads, models), Redis caches, message queues/event buses.
- **Identity & access**: SSO (OIDC/SAML), service accounts, API keys/tokens, secrets management (Vault/KMS), RBAC/ABAC policy engine.
- **Infrastructure**: Kubernetes clusters, container images, CI/CD runners, build artifacts, Terraform/Helm/IaC state, ingress/load balancers, CDN/edge caches.
- **Observability & security tooling**: logs/metrics/traces, SIEM/SOAR connectors, provenance ledger, audit trails.
- **Third-party dependencies**: npm/pnpm packages, Rust crates, Python packages, OS packages, external AI/model services.

**Data classification (minimum baseline)**

- **Restricted**: PII, customer content, credentials, cryptographic keys, audit evidence.
- **Confidential**: internal investigations, non-public product/roadmap, incident artifacts.
- **Internal**: operational runbooks, dashboards, build metadata.
- **Public**: published docs and marketing materials.

### Trust Boundaries

- **External users ↔ Edge**: public internet to CDN/WAF/ingress. Enforce TLS, WAF rules, rate limiting, bot detection.
- **Edge ↔ App tier**: ingress to services. Apply mutual TLS/service identity, authZ via gateway/policy checks.
- **App tier ↔ Data tier**: services to databases/queues/caches/object storage. Enforce network policies, least-privilege credentials, encryption in transit/at rest.
- **Tenant ↔ Tenant**: multi-tenant isolation across storage, compute, and authZ policies.
- **CI/CD ↔ Runtime**: build pipelines to registries/clusters. Sign artifacts (SLSA/COSIGN), verify signatures and provenance before deploy.
- **Internal services ↔ External dependencies**: outbound calls to third-party APIs/LLM providers. Use egress controls, allow-lists, and secret scoping.
- **Operator access ↔ Production**: break-glass access through audited, time-bound sessions with MFA.

### Primary Threats

- **AuthN/AuthZ flaws**: privilege escalation, token replay, missing policy enforcement, JWT tampering, improper tenant scoping.
- **Data security**: PII exfiltration, data leakage via logs/telemetry, insecure object storage ACLs, injection leading to data corruption.
- **Supply chain**: dependency typosquatting, compromised build artifacts, unsigned containers, malicious IaC modules, poisoned base images.
- **Application attacks**: injection (SQL/NoSQL/GraphQL), SSRF, XSS, CSRF, deserialization issues, path traversal in uploads, LLM prompt injection.
- **Availability**: DDoS on APIs, resource exhaustion (queue flooding, cache poisoning), runaway jobs, noisy-neighbor in multi-tenancy.
- **Secrets & keys**: leaked tokens/keys, weak rotation, secrets in repos or images, compromised CI secrets.
- **Model/AI-specific**: model poisoning, unsafe model outputs, excessive data retention in embeddings, prompt leaking via context windows.
- **Insider risk**: privileged misuse, excessive permissions, shadow admin accounts.

### Mitigations

- **Identity & access**: enforce SSO, short-lived tokens, mTLS between services, centralized policy-as-code (OPA/Conftest) with deny-by-default, role scoping, per-tenant isolation guards, privileged access management.
- **Input validation & hardening**: strict schema validation on all inputs, parameterized queries, output encoding, CSP + secure headers, CSRF protection, upload scanning/quarantine, SSRF-safe HTTP clients.
- **Data protection**: encrypt in transit (TLS 1.2+/mTLS) and at rest (KMS-managed keys), field-level encryption for sensitive attributes, access logging with immutable provenance ledger, least-privilege DB roles, row/column-level security where applicable.
- **Supply chain integrity**: lockfiles + dependency pinning, automated SCA (Snyk/Trivy), signature verification for containers/artifacts (cosign/SLSA attestations), reproducible builds, vendor allow-lists, periodic SBOM generation.
- **Operational safeguards**: WAF + rate limiting + bot detection at edge, autoscaling with circuit breakers/bulkheads, resource quotas, health checks, chaos testing in staging.
- **Secrets management**: store secrets in Vault/KMS, never in repo; automatic rotation policies; scoped service accounts; detect secrets via gitleaks; restrict build logs from printing secrets.
- **AI safety**: prompt templates with guardrails, content filtering, output redaction, model-level rate limits, isolation of training data, evaluation for jailbreaks/prompt injection, provenance tagging of model outputs.
- **Monitoring & detection**: central logging to SIEM with anomaly rules, runtime security (Falco/EBPF) for containers, cloud audit logs, integrity monitoring for IaC drift, alerting tied to on-call rotations.

### Threat-to-Control Mapping (non-exhaustive)

| Threat category     | Primary controls                                             | Evidence sources                          |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| AuthN/AuthZ         | SSO, short-lived tokens, OPA policy checks, tenant isolation | auth logs, policy decision logs           |
| Data exfiltration   | encryption, least-privilege DB roles, audit ledger           | DB audit logs, object storage access logs |
| Supply chain        | SCA, SBOMs, signed artifacts                                 | SBOM registry, cosign attestations        |
| Application attacks | schema validation, WAF rules, secure headers                 | WAF logs, app telemetry                   |
| Availability        | rate limiting, autoscaling, queue limits                     | metrics/SLO dashboards                    |
| Secrets leakage     | Vault/KMS, gitleaks, rotation                                | secrets inventory, rotation logs          |
| AI misuse           | guardrails, content filters, provenance tags                 | model usage logs, safety evals            |

## Security Controls

Our CI/CD pipeline enforces a number of security controls on every pull request and release. These controls are defined in the `.github/workflows/ci-security.yml` workflow.

- **Secret Scanning**: We use `gitleaks` to scan for hardcoded secrets in the codebase. This is configured to run on every pull request and fail the build if any secrets are found.

- **Static Application Security Testing (SAST)**: We use `CodeQL` and `Semgrep` to identify potential vulnerabilities in our code. `CodeQL` is configured to run on both JavaScript and Python code. `Semgrep` uses the `p/ci` ruleset to check for common security issues.

- **Dependency Vulnerability Scanning**: We use `Snyk` to scan our dependencies for known vulnerabilities. The `SNYK_FAIL_THRESHOLD` is set to `high`, which means that pull requests with `HIGH` or `CRITICAL` vulnerabilities will be blocked from merging.

- **Filesystem and Container Scanning**: We use `Trivy` to scan our filesystem and container images for vulnerabilities. This includes scanning for known CVEs in the operating system and application packages.

- **Infrastructure-as-Code (IaC) Scanning**: We use `Checkov` to scan our Terraform and Helm charts for misconfigurations. This helps to ensure that our infrastructure is deployed in a secure manner.

- **Policy Enforcement**: We use `OPA/Conftest` to enforce policies on our Kubernetes manifests. This allows us to define and enforce custom security policies for our production environment.

- **Dynamic Application Security Testing (DAST)**: We use `OWASP ZAP` to perform dynamic analysis of the running application. This is configured to run on a weekly schedule against the staging environment.

## Incident Response

### Roles & RACI

| Role                                   | Responsibilities                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Incident Commander (IC)**            | Owns incident coordination, scope/priority decisions, approves containment/eradication steps. |
| **Security Operations (SecOps)**       | Detection, triage, forensics, SIEM/SOAR tuning, evidence handling.                            |
| **Site Reliability Engineering (SRE)** | Service restoration, rollback/deploy fixes, traffic controls, infra recovery.                 |
| **Engineering DRI (per system)**       | Code fixes, hot patches, technical SME, root cause support.                                   |
| **Communications Lead**                | Internal/external updates, stakeholder comms, status reports.                                 |
| **Legal & Privacy**                    | Breach assessment, regulatory notifications, data handling guidance.                          |
| **Product/Customer Success**           | Customer impact assessment, outreach, support coordination.                                   |
| **Executive Sponsor**                  | Escalation point for business risk, resource approvals.                                       |

**RACI by phase**

| Phase       | IC  | SecOps | SRE | Eng DRI | Comms | Legal/Privacy | Product/CS | Exec Sponsor |
| ----------- | --- | ------ | --- | ------- | ----- | ------------- | ---------- | ------------ |
| Detection   | A   | R      | C   | C       | I     | I             | I          | I            |
| Triage      | A   | R      | C   | C       | I     | C             | C          | I            |
| Containment | A   | R      | R   | R       | C     | C             | C          | I            |
| Eradication | A   | R      | R   | R       | I     | C             | I          | I            |
| Recovery    | A   | C      | R   | R       | C     | C             | C          | I            |
| Postmortem  | A   | R      | R   | R       | R     | C             | C          | I            |

### Communication Channels

- **Paging/On-call**: PagerDuty/opsgenie rotations for IC, SecOps, SRE.
- **Incident Chat**: dedicated channel (`#incidents-<id>`) with bot-created timeline and pinned runbook.
- **Video Bridge**: always-on meeting link for major incidents (SEV-1/SEV-2).
- **Email**: security@summit.ai for intake; exec-updates@summit.ai for leadership briefings.
- **Ticketing**: incident tickets in IR tracker; linked JIRA for remediation tasks; postmortem doc in shared drive.
- **Status page**: public/private status page updates driven by Comms Lead.

### Severity & SLAs (time from detection)

- **SEV-1 (Critical)**: Active exploitation or material data risk. Detect→Triage ≤15m; Containment ≤1h; Customer comms ≤1h; Full restoration ≤4h; Postmortem draft ≤48h.
- **SEV-2 (High)**: Significant exposure or high-likelihood exploit without widespread impact. Detect→Triage ≤30m; Containment ≤4h; Restoration ≤12h; Postmortem draft ≤72h.
- **SEV-3 (Medium)**: Limited scope/low-likelihood security issues. Triage ≤4h; Containment ≤24h; Restoration ≤3d; Postmortem draft ≤5d.
- **SEV-4 (Low)**: Non-urgent hygiene issues. Triage ≤2d; Planned remediation per backlog prioritization.

**Escalation triggers (examples)**: confirmed credential compromise, cross-tenant exposure, integrity breach, or regulatory notification requirements.

### Phases & Actions

- **Detection**: SIEM alerts, runtime sensors, anomaly detection, user reports. Verify fidelity, capture initial indicators (timestamps, IPs, affected services). IC assigned.
- **Triage**: Classify severity, validate scope, confirm exploitability, protect evidence (log retention snapshots, forensic disk/memory where applicable). Update incident ticket with hypothesized blast radius.
- **Containment**: Short-term (block indicators, revoke/rotate credentials, disable affected accounts, isolate pods/nodes), long-term (feature flags, traffic throttling, WAF rules, DNS/routing changes). Document steps and timestamps.
- **Eradication**: Remove malicious artifacts, patch vulnerabilities, clean persistence mechanisms, purge compromised keys/tokens, validate integrity of configs/IaC and container images.
- **Recovery**: Restore services with validated images/builds, re-enable traffic gradually (canary/blue-green), monitor for regression, re-run security tests (SAST/DAST), verify data integrity.
- **Postmortem**: Blameless report covering timeline, root cause, impact, detection gaps, control failures, and action items with owners/ETAs. Require RACI + tracking in backlog, and retro to improve playbooks and detections.

### Incident Artifacts & Evidence Handling

- **Evidence preservation**: snapshot relevant logs, traces, and cloud audit events at detection time; extend retention during active incidents.
- **Chain of custody**: record who collected artifacts, when, and where stored; store in tamper-evident locations.
- **Access control**: restrict artifacts to incident team and Legal/Privacy; track all access in audit logs.

### Communication & Update Cadence

- **SEV-1**: internal updates every 30 minutes; external updates every 60 minutes or per regulatory guidance.
- **SEV-2**: internal updates every 60 minutes; external updates as needed.
- **SEV-3/4**: internal updates daily or per ticketing workflow.

### Readiness & Drills

- Quarterly tabletop exercises for SEV-1 scenarios; monthly playbook reviews; rotating red-team/chaos drills in staging to validate containment and recovery steps.
- After-action items tracked in backlog with owners and due dates; follow-up validation required.

### Evidence & Logging Requirements

- Preserve logs, traces, alerts, audit records, and access tokens involved in the incident with tamper-evident storage and retention aligned to legal guidance.
- Maintain chain-of-custody for forensic artifacts; restrict access via need-to-know; record all actions in the incident timeline.

## Reporting a Vulnerability

Please report any security vulnerabilities to our security team at `security@summit.ai`. We appreciate your efforts to disclose your findings responsibly.
