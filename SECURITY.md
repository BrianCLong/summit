# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Supported Deployment Models

Summit supports the following deployment models:

- **Local/Dev**: Docker Compose-based stack for development and validation.
- **Self-hosted**: Kubernetes or Docker-based production deployments using the repo manifests.

Any deployment model not listed above is **unsupported** unless documented as a **Governed Exception**.

## Secrets Handling

Summit treats secret handling as a production safety requirement:

- **No secrets in repo**: Never commit credentials, tokens, or private keys.
- **Environment-first**: Inject secrets via environment variables or secret managers.
- **External secret managers**: Prefer Vault, AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault.
- **Least-privilege**: Scope secrets to the minimum runtime needed.

## Reporting a Vulnerability

Please report security vulnerabilities to **security@summit.ai**.

We will acknowledge receipt within 24 hours and provide a timeline for triage and remediation.

### Disclosure Policy

- **Embargo:** We request a 30-day embargo on public disclosure to allow for remediation.
- **Bounty:** We do not currently offer a bug bounty program.
- **Safe Harbor:** We will not take legal action against researchers who discover and report vulnerabilities in good faith and in accordance with this policy.

### Incident Response & Triage

- **Triage Runbook**: For the standardized process of handling vulnerabilities and alerts, see the [Security Triage Runbook](docs/runbooks/security-triage.md).
- **Incident Response**: For critical security incidents, refer to the [Security Incident Response Runbook](docs/runbooks/security-incident-response.md) and the [Incident Response Playbook](docs/ops/INCIDENT_RESPONSE.md).

### Governance & Backlog

- **Security Backlog**: We maintain a deterministic backlog of security and governance items at [SECURITY_BACKLOG.md](docs/governance/SECURITY_BACKLOG.md).
- **Provenance Policy**: Requirements for supply-chain integrity are defined in [PROVENANCE.md](docs/ga/PROVENANCE.md).
- **Readiness Assertion**: Governance gates are defined in [Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md).

### Evidence

For compliance evidence regarding vulnerability management, see [Evidence Index](docs/compliance/EVIDENCE_INDEX.md).

## Baseline Controls

Summit enforces baseline controls across CI and production:

- **CIS hardening**: Baseline expectations captured in security hardening guidance and GA gates.
- **SAST/Dependency scanning**: CodeQL and Dependabot alerts are treated as blocking at critical severity.
- **Secret scanning**: Gitleaks and platform secret scanners are required.
- **Policy-as-code**: OPA/Conftest and governance lockfiles are mandatory for configuration integrity.

## GitHub Security Settings (Minimum)

- **Branch protection**: `main` requires PRs, no direct commits.
- **Required reviews**: At least one human approval; agents cannot self-approve.
- **Required checks**: CI gate workflows, evidence validation, and security scanners.
- **Signed commits**: All commits must be verified.
- **Dependency alerts**: Dependabot and CodeQL alerts are enabled and monitored.

## Threat Model (MAESTRO Aligned)

We utilize the **MAESTRO Threat Modeling Framework** to secure our agentic AI environment. See [Summit MAESTRO Framework](docs/security/threat-modeling-framework.md) for the detailed methodology.

### Assets

- **Customer Data:** PII, usage metrics, and proprietary graph data stored in **Neo4j** and **PostgreSQL**.
- **Intellectual Property:** Source code, ML models (PyTorch/ONNX), and proprietary algorithms (Rust crates for graph processing).
- **Availability:** The ability for the platform to serve requests via the **IntelGraph API**.
- **Agent Integrity:** The alignment and correct behavior of autonomous agents (Jules, Maestro).

### Threats

- **Adversarial AI:** Prompt injection, goal hijacking, model abuse, and data poisoning.
- **Unauthorized Access:** External attackers gaining access to data or systems.
- **Insider Threat:** Malicious or negligent employees compromising security.
- **Supply Chain Attack:** Compromise of third-party dependencies (Rust crates, NPM packages, Python libs) or build tools.
- **Denial of Service:** Attacks aiming to disrupt service availability.

### Mitigations

- **AI Guardrails:** Input/Output validation, deterministic safety checks, and adversarial testing.
- **Identity & Access Management:** Strong authentication (MFA), least privilege (RBAC) enforced via API Gateway.
- **Encryption:** Data encrypted at rest (AES-256 via **HashiCorp Vault/KMS**) and in transit (TLS 1.2+).
- **Vulnerability Management:** Regular scanning of code and dependencies (**Trivy**, **Dependabot**).
- **Policy Enforcement:** **OPA/Conftest** policies for configuration validation in CI/CD.
- **Monitoring & Alerting:** Comprehensive observability stack (**Prometheus**, **Grafana**) to detect anomalies.

## Scope & Exclusions

**Covered:**

- Application security (code, dependencies, build pipeline).
- Infrastructure as Code configuration.
- Operational runbooks and incident response policies.

**Excluded (Out of Scope):**

- Physical security of data centers (managed by Cloud Provider).
- Personnel security (background checks, HR policies).
- Third-party audits (SOC2/ISO certification reports are available upon request but not stored in this repo).
