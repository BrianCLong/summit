# Security Policy

This document outlines the security policy for the Summit (IntelGraph) platform.

## Threat Model

### Assets & Trust Boundaries

- **Crown jewels**: customer intelligence data, graph relationships, AI prompts/completions, provenance ledger, model configurations, and service account secrets.
- **Execution surfaces**: public web frontends, APIs (REST/GraphQL), ingestion pipelines, background workers, and CI/CD runners.
- **Trust boundaries**: internet ingress → edge (WAF/CDN) → API gateway → services → data stores; internal-only control plane (policy engine, audit log, model management); build pipeline (CI/CD → artifact registry → runtime).

### Primary Threats & Mitigations

| Threat                                 | Vector                                          | Primary Mitigations                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credential/secret leakage              | Accidental commits, logs, or build artifacts    | Mandatory `gitleaks`, commit signing, secret scanning gates, and least-privilege secrets distribution (per-service env files + Vault/KMS); no secrets in CI output. |
| Supply chain compromise                | Dependency CVEs or hijacked packages/containers | Dependabot coverage (npm, Go, Actions, **Cargo**), Snyk/Trivy scans, pinned base images, SBOM generation, and provenance attestations before release.               |
| Injection (SQL/NoSQL/command/prompt)   | Untrusted user input into queries or models     | Centralized input validation, parameterized queries, output encoding, prompt templates with strict variable binding, and content safety filters.                    |
| AuthN/Z bypass & session abuse         | Token theft, JWT replay, privilege escalation   | Short-lived tokens, audience/issuer checks, mTLS for service-to-service, OPA/Conftest policy enforcement, and anomaly detection on auth events.                     |
| Data exfiltration & privacy violations | Overbroad queries or model responses            | Row/column-level access policies, PII tagging + redaction, rate limits, and audit trails in the immutable ledger.                                                   |
| DoS/resource exhaustion                | Flooding ingestion/API/model endpoints          | WAF rules, per-tenant rate limiting, circuit breakers, autoscaling with budgets, and prioritized queues for critical workloads.                                     |
| Model abuse & prompt injection         | Malicious prompts or tool calls                 | Guardrails on tool schemas, allow/deny lists for tools/connectors, grounded retrieval with safety checks, and user-visible citations for model outputs.             |

### Monitoring & Detection

- Security events flow to SIEM with enriched context (identity, service, request ID, trace ID).
- Provenance ledger captures mutation/audit events; alerts emit on policy violations and anomalous access patterns.
- Critical controls are codified as policy-as-code and enforced in CI/CD via `pr-quality-gate.yml`.

### Recovery & Resilience

- Daily encrypted backups with periodic restore drills; RPO/RTO tracked in runbooks.
- Immutable audit log plus signed SBOMs support forensic validation of deployed artifacts.
- Chaos and tabletop exercises validate containment and recovery paths quarterly.

### Governance & Policy-as-Code

- Regulatory requirements are implemented and enforced in the policy engine as code (OPA/Conftest), with CI validation through `pr-quality-gate.yml` and `ci-security.yml`.
- Decisions requiring compliance or ethics review are logged to the provenance ledger with ticket references, and exceptions require security-council escalation.
- Public standards and documented controls are favored over proprietary or ad-hoc rules; deviations must be approved and recorded.

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

### Workflow & SLAs

1. **Detection** (Target: ≤5 minutes from alert): Automated alerts from SIEM, WAF, or CI security jobs page on-call via PagerDuty.
2. **Triage** (≤15 minutes): Incident Commander (IC) classifies severity (SEV1–SEV4), confirms scope, and opens an incident channel + ticket.
3. **Containment** (≤30 minutes for SEV1/SEV2): Revoke/rotate credentials, block offending IPs, disable compromised connectors, and freeze affected deployments; artifact provenance is verified before any redeploy.
4. **Eradication**: Remove malicious artifacts, patch vulnerabilities, and validate with SAST/DAST scans plus policy checks.
5. **Recovery**: Restore services from trusted artifacts/backups, re-enable connectors behind feature flags, and monitor for recurrence for ≥24 hours.
6. **Postmortem** (draft within 48 hours): Blameless review with timeline, root cause, control gaps, and assigned remediation actions with owners and due dates.

### Roles & RACI

- **Incident Commander (IC)**: Leads response, severity calls, and communication cadence (Responsible/Accountable).
- **Security Operations (SecOps)**: Detection engineering, forensics, containment playbooks (Responsible).
- **Service Owners**: Remediation of service-specific issues and validation (Responsible).
- **Comms Lead**: Stakeholder/customer updates (Consulted), coordinates with legal if required.
- **Compliance**: Ensures evidence collection, tracks regulatory notifications (Informed/Consulted depending on impact).

### Communication Channels

- **Primary**: Incident Slack/Teams channel + PagerDuty incident with runbook links.
- **Escalation**: security-council@ and exec-brief mailing list for SEV1/SEV2; legal@ looped for potential disclosure events.
- **Status**: Public-facing status page updates for customer-impacting incidents; intra-incident updates at least every 30 minutes for SEV1/SEV2.

### Evidence & Reporting

- Collect logs, traces, audit events, and SBOM/provenance attestations; attach to the incident ticket.
- Maintain chain-of-custody for forensic images and backups.
- Record control failures and map to remediation tasks tracked to closure.
- Capture compliance/ethics review decisions with approvers, timestamps, and policy references in the incident record.

## Reporting a Vulnerability

Please report any security vulnerabilities to our security team at `security@summit.ai`. We appreciate your efforts to disclose your findings responsibly.
