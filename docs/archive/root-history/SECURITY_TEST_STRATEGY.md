# CompanyOS Security Testing & Threat Modeling Strategy

This document operationalizes security as code for CompanyOS, making security gates repeatable, automated, and auditable.

## 1. Security Testing Strategy

### 1.1 Required Checks per Pull Request

| Category              | Tools/Jobs                                                                                                                         | Scope                                                                                        | Failure Policy                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **SAST**              | Semgrep (rulepacks: OWASP Top 10, authz/authn, multi-tenant), ESLint security plugins, Bandit (Python), cargo clippy + deny (Rust) | Changed files + high-risk shared libs                                                        | **Blocker** on high/critical findings; medium allowed only with suppression and issue link.                                     |
| **Dependency Scan**   | Snyk/OWASP Dependency-Check, npm/yarn/pnpm audit, `cargo audit`, `pip-audit`                                                       | All dependency manifests (`package*.json`, `Cargo.toml`, `requirements*.txt`, `poetry.lock`) | **Blocker** for exploitable/high CVEs; allow-list requires security approval + expiry.                                          |
| **Secret Scan**       | Trufflehog/Gitleaks, commit-history mode on PR branch                                                                              | Entire diff + history since merge-base                                                       | **Blocker**; leaks require revocation proof + secret rotation checklist.                                                        |
| **Policy Evaluation** | OPA/Conftest (K8s, Terraform, GitHub Actions), rego bundles: tenancy, network egress, encryption, logging                          | IaC + CI configs in diff                                                                     | **Blocker** when mandatory controls (encryption, TLS, audit logging) missing; warning for advisory rules with issue auto-filed. |
| **Supply Chain**      | Sigstore cosign verification for base images & artifacts, checksum validation for vendored assets                                  | Container builds, vendored binaries                                                          | **Blocker** if signature missing/invalid; exceptions time-bound with ticket.                                                    |
| **Compliance Hooks**  | Data-classification labels on PR, DLP policy matchers for PII/PCI content                                                          | PR description + changed files                                                               | **Blocker** if classification missing for services handling regulated data.                                                     |

### 1.2 Periodic & Scheduled Scans

| Cadence       | Checks                                                                                                                                      | Owners                           | Notes                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| **Daily**     | Dependency drift (`npm audit`, `cargo audit`, `pip-audit`), container base image CVE scan (Grype/Trivy)                                     | SRE + Security Eng               | Auto-create tickets with fix version SLA by severity.              |
| **Weekly**    | DAST against staging (OWASP ZAP/StackHawk), authenticated flows via stored HARs; config drift detection for K8s, Terraform state vs desired | AppSec + Platform                | Failures break deploy-to-prod gate until triaged.                  |
| **Monthly**   | Cloud posture scan (CIS/Kubernetes/PCI profiles), IAM least-privilege review, egress allowlist review                                       | Cloud Sec                        | Produce evidence pack for audit; remediation SLA 30 days for high. |
| **Quarterly** | Chaos abuse simulations (credential stuffing, JWT replay, RBAC bypass), tabletop incident rehearsal                                         | Security Eng + Incident Response | Feed findings into threat model backlog and regression tests.      |

### 1.3 Criticality & Data Classification Gates

- **Service criticality levels:** P0 (customer data plane), P1 (control plane/auth), P2 (internal tools), P3 (non-prod prototypes).
- **Data classification:** Public, Internal, Confidential, Restricted (PII/PHI/PCI), Secret (keys/tokens).
- **Gate matrix:**
  - P0/P1 + Restricted/Secret: require full PR checks + manual AppSec approval for schema changes, mandatory DAST in release candidate, chaos abuse pack before launch.
  - P2 + Confidential: full PR checks; DAST monthly; infra scans weekly.
  - P3 + Internal/Public: PR checks run but advisory findings may be waived with auto-created follow-up issues; no prod deploys allowed without dependency and secret scan passing.
- **Evidence:** PR template enforces classification fields; CI uploads SARIF + signed attestations to artifact store for audit trail.

## 2. Security Harnesses & Golden Tests

### 2.1 Shared Test Fixtures

- **Authn/Authz:** Mock OIDC provider with JWT rotation, clock-skew controls, JTI replay cache; policy harness with least-privilege RBAC/ABAC matrices and deny-by-default checks.
- **Multi-tenant isolation:** Tenant context propagator fixture injecting tenant IDs via headers, metadata, and tracing; cross-tenant access oracle that asserts no data leakage across tenant boundary in integration tests.
- **Data residency:** Region-locked storage simulators (S3 bucket mock with region policies), geo-fenced KMS keys, and assertions that data paths include residency tags.

### 2.2 Golden Tests (imported by every service)

- **Authentication invariants:** All endpoints require auth; tokens must validate issuer/audience, enforce MFA claim for admin scopes; refresh-token reuse detection.
- **Authorization invariants:** RBAC/ABAC matrix runner that exercises allow/deny cases per resource; negative tests for privilege escalation (e.g., role downgrades, tenant switch).
- **Input validation & deserialization:** Fuzz harness for JSON/protobuf payloads, size/time limits, content-type validation, and PII redaction on error paths.
- **Logging/telemetry:** Ensures audit logs emit actor, action, resource, tenant, correlation IDs; forbids secrets/PII in logs; traces include auth context.
- **Data handling:** Encryption-at-rest/in-transit assertions; checksum of artifacts; backup/restore integrity smoke test for stateful services.
- **Resilience & anti-abuse:** Rate-limit and circuit-breaker golden tests; idempotency key enforcement; replay/jitter tests on webhooks and job schedulers.

### 2.3 Attacker Simulation in Automated Tests

- **Abuse cases:** credential stuffing with password spraying wordlists; session fixation; JWT kid header tampering; SSRF against internal metadata endpoints; mass assignment of JSON fields; pagination scraping; race conditions on state transitions.
- **Tooling:**
  - Property-based tests seeded with attack payload corpora.
  - Chaos hooks to inject latency/faults in auth/token/cache layers.
  - Red-team-inspired Playwright flows that replay MITM-ed traffic against staging with randomized timing.
- **Success criteria:** attacks must be blocked, logged with high fidelity, and generate alert events routed to SIEM with runbook link.

## 3. Threat Modeling Process

### 3.1 Lightweight Template (per service/change)

- **Context:** system description, assets, data classification, trust boundaries.
- **Entry points:** user/UI, APIs, webhooks, admin tools, background jobs, third-party integrations.
- **Threat enumeration:** STRIDE + privacy harms; link to golden tests and abuse cases.
- **Controls:** prevent/detect/respond mappings, compensating controls, logging/alerting.
- **Decisions & residual risk:** rationale, owner, review date.
- **Verification:** required tests/scans tied to threats with evidence location.

### 3.2 Triggers for Deep Review

- New external integration, new data store or queue, cryptography changes, handling Restricted/Secret data, internet-exposed service, new multi-tenant boundary, bypass of central authz, or deviation from baseline policies.
- Deep review requires tabletop + manual threat model workshop, code walkthrough, and proof via security harness execution before merge.

### 3.3 Tracking & Closure

- Threats tracked as tickets with CWE/CVE tags; each must link to evidence: SARIF, test reports, signed attestations, or playbook references.
- CI enforces that tickets in "mitigated" state include evidence artifact checksum + URL; reopening required on regression or scan finding reappearance.
- Quarterly audit samples 10% of closed threats to verify evidence integrity and residual risk sign-off.

## 4. Artifacts

### 4.1 CompanyOS Security Test Suite v0 (Outline)

- **Owners:** Security Engineering (golden tests, harness), AppSec (SAST/DAST rules), Platform/SRE (infra/policy scans), Service teams (adoption + SLAs).
- **Categories:**
  - Identity & Access (authn, authz, session, MFA, tenant isolation).
  - Data Protection (encryption, residency, backups, key management).
  - Application Security (input validation, SSRF/XXE, template/SQL injection, deserialization, file uploads).
  - Resilience & Abuse Resistance (rate limits, replay/idempotency, resource exhaustion, chaos scenarios).
  - Supply Chain (SBOM, signature verification, provenance attestations).
  - Observability & Audit (logging quality, trace propagation, SIEM/alert hooks).
  - Privacy & Compliance (PII minimization, retention/erasure flows, consent tracking).

### 4.2 Example Security CI Pipeline

1. **Pre-checks:** license compliance, secret scan (block on detection), dependency diff + baseline drift check.
2. **Build & SBOM:** build artifacts, generate SBOM (Syft/cyclonedx), verify base image signatures.
3. **SAST & Policy:** language SAST (Semgrep/Bandit/ESLint), IaC policy (OPA/Conftest), fail on critical/high.
4. **Unit/Golden Tests:** run shared security harness + service unit tests with coverage gate; enforce authz/authn invariants.
5. **Integration/DAST (preview env):** ephemeral env per PR, run abuse-case Playwright + ZAP; block on exploitable findings.
6. **Attestations & Upload:** sign test results, SBOM, and provenance with cosign; upload to artifact bucket; update PR status.
7. **Manual Approval (as needed):** for P0/P1 or Restricted data changes; require threat model link and evidence bundle.

### 4.3 Failure & Waiver Policy

- **Automatic block** on critical/high vulnerabilities, missing signatures, failing golden tests, or secret leaks.
- **Waivers:** must include ticket ID, expiry date, compensating control, and approver from Security Eng; CI annotates PR and posts comment.
- **Rollback:** failed deploys trigger automated rollback and freeze further deploys until root cause is documented and regression tests added.

### 4.4 Threat Model Template (Prompts)

- **Overview:** What does the service do? Who are the actors? What data classes are processed? What is the criticality level?
- **Architecture:** Diagrams of trust boundaries, dependencies, and data flows. Where are identities asserted and enforced?
- **Entry Points:** Enumerate APIs, webhooks, schedulers, admin tools, message consumers. What is authenticated vs anonymous?
- **Threats:** For each STRIDE category, list threats + abuse cases. Which golden tests validate controls?
- **Controls & Compensations:** Authn/authz, input validation, logging, rate limits, crypto, residency, backups, monitoring.
- **Assumptions & Residual Risk:** What assumptions could fail? What risks remain and why are they accepted?
- **Validation:** Which scans/tests/attestations prove controls? Where is evidence stored? Who signs off and by when?
- **Follow-ups:** Tickets, owners, due dates, and regression test IDs.

## 5. Forward-Looking Enhancements

- **State-of-the-art:** add LLM-aided Semgrep rule synthesis from incident postmortems; integrate eBPF-based syscall anomaly detection in staging; deploy policy-as-code drift guardrails using GitOps admission controllers with Sigstore-keyed trust roots.
- **Metrics:** MTTR for security fixes, coverage of golden test imports per service, percentage of artifacts signed, and time-to-detect for abuse simulations.
