# Control Registry

## Control Ownership by Directory Boundary

Control ownership is determined by directory boundary:

- `infra/`, `k8s/`: Platform / Infra
- `server/`: Application Security
- `docs/governance/`: Governance Board
- `docs/ai/`: Model Oversight
- `docs/compliance/`: Compliance Officer

This document serves as the authoritative source for all compliance controls enforced within this repository. It defines the "Reference Controls" that map to external frameworks (SOC2, ISO, NIST, AI Governance).

| Control ID  | Control Name              | Description                                                                                                          | Enforcement Point                   | Evidence Artifact                                                             |
| :---------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------- | :---------------------------------- | :---------------------------------------------------------------------------- |
| **GOV-01**  | Code of Conduct & Ethics  | Defines the ethical standards and behavior expected from contributors and maintainers.                               | Policy (Repository Root)            | `CODE_OF_CONDUCT.md`                                                          |
| **GOV-02**  | Documentation Standards   | Ensures all systems, APIs, and processes are documented to a standard that enables maintainability and auditability. | Policy (Docs Directory)             | `docs/README.md`, `docs/governance/`                                          |
| **RISK-01** | Risk Assessment           | Periodic assessment of technical and business risks, including threat modeling.                                      | Process (Manual)                    | `docs/risk/RISK_LEDGER.md`                                                    |
| **SEC-01**  | Access Control (IAM/RBAC) | Enforces least privilege access via Role-Based Access Control (RBAC) and Identity Access Management (IAM).           | Code (API Middleware)               | `server/src/middleware/auth.ts`, `infra/iam/`                                 |
| **SEC-02**  | Network Security          | Controls network traffic via segmentation, firewalls (Security Groups), and mutual TLS.                              | Infrastructure as Code              | `infra/eks-baseline/terraform/`, `k8s/network-policies/`                      |
| **SEC-03**  | Data Encryption           | Ensures data is encrypted at rest (database, storage) and in transit (TLS 1.2+).                                     | Configuration                       | `infra/aws/rds-postgres/`, `scripts/clusterissuer-letsencrypt.yaml`           |
| **SEC-04**  | Vulnerability Management  | Automated scanning of dependencies and container images for known vulnerabilities.                                   | CI/CD Pipeline                      | `.github/workflows/ci-security.yml`, `docs/compliance/evidence_collection.md` |
| **SEC-05**  | Secret Management         | Management of cryptographic keys and secrets, ensuring they are not committed to code.                               | CI/CD & Infrastructure              | `k8s/external-secrets/`, `.gitignore`                                         |
| **OPS-01**  | Incident Response         | Procedures for detecting, responding to, and recovering from security and operational incidents.                     | Process (Playbook)                  | `docs/ops/INCIDENT_RESPONSE.md`                                               |
| **OPS-02**  | Observability & Logging   | centralized logging and monitoring to detect anomalies and ensure availability.                                      | Infrastructure (Prometheus/Grafana) | `charts/observability/`, `infra/observability/`                               |
| **OPS-03**  | Change Management         | Formal process for code changes, including peer review, testing, and automated deployment (GitOps).                  | CI/CD & Process                     | `.github/workflows/`, `docs/governance/GOVERNANCE_RULES.md`                   |
| **OPS-04**  | Disaster Recovery         | Strategies and mechanisms to recover data and services in case of catastrophic failure.                              | Process & Tooling                   | `docs/runbooks/dr/`, `charts/velero/`                                         |
| **OPS-05**  | Supply Chain Security     | Verification of software artifacts (SBOM, Signing) to prevent tampering.                                             | CI/CD Pipeline                      | `.github/workflows/reusable-golden-path.yml` (Cosign)                         |
| **AI-01**   | Model Governance          | Tracking of model provenance, training data, and ethical usage guidelines.                                           | Policy & Metadata                   | `docs/ai/MODEL_GOVERNANCE.md`, `model-cards/`                                 |

## Out of Scope for This System

- Control effectiveness testing (penetration tests, audits)
- Regulatory certification (SOC report issuance, ISO certification)
- Runtime risk scoring beyond documented controls
