# Control Registry

## Control Ownership by Directory Boundary

Control ownership is determined by directory boundary:

*   `infra/`, `k8s/`: Platform / Infra
*   `server/`: Application Security
*   `docs/governance/`: Governance Board
*   `docs/ai/`: Model Oversight
*   `docs/compliance/`: Compliance Officer

This document serves as the authoritative source for all compliance controls enforced within this repository. It defines the "Reference Controls" that map to external frameworks (SOC2, ISO, NIST, AI Governance).

| Control ID | Control Statement | Mechanism(s) | Verification | Evidence | Owner | Frequency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GOV-01** | Defines the ethical standards and behavior expected from contributors and maintainers. | `CODE_OF_CONDUCT.md` | `ls -l CODE_OF_CONDUCT.md` | `CODE_OF_CONDUCT.md` | Maintainer | Static |
| **GOV-02** | Ensures all systems, APIs, and processes are documented to a standard that enables maintainability and auditability. | `docs/` directory structure | `ls -R docs/` | `docs/README.md`, `docs/governance/` | Maintainer | Static |
| **RISK-01** | Periodic assessment of technical and business risks, including threat modeling. | Manual Process | `ls -l docs/risk/RISK_LEDGER.md` | `docs/risk/RISK_LEDGER.md` | Security Eng | Annually |
| **SEC-01** | Enforces least privilege access via Role-Based Access Control (RBAC) and Identity Access Management (IAM). | `server/src/middleware/auth.ts` | `grep "function ensureAuthenticated" server/src/middleware/auth.ts` | Source Code | Application Security | Per PR |
| **SEC-02** | Controls network traffic via segmentation, firewalls (Security Groups), and mutual TLS. | `infra/eks-baseline/terraform/` | `grep "aws_security_group" infra/eks-baseline/terraform/main.tf` | Infrastructure as Code | Platform / Infra | Per PR |
| **SEC-03** | Ensures data is encrypted at rest (database, storage) and in transit (TLS 1.2+). | `infra/aws/rds-postgres/` | `grep "storage_encrypted" infra/aws/rds-postgres/main.tf` | Configuration | Platform / Infra | Per PR |
| **SEC-04** | Automated scanning of dependencies and container images for known vulnerabilities. | `.github/workflows/ci-security.yml` | `cat .github/workflows/ci-security.yml \| grep trivy` | CI Job Logs | Security Eng | Per PR |
| **SEC-05** | Management of cryptographic keys and secrets, ensuring they are not committed to code. | `.gitignore`, `k8s/external-secrets/` | `grep ".env" .gitignore` | Configuration | Maintainer | Per PR |
| **OPS-01** | Procedures for detecting, responding to, and recovering from security and operational incidents. | `docs/ops/INCIDENT_RESPONSE.md` | `ls -l docs/ops/INCIDENT_RESPONSE.md` | Document | SRE | Static |
| **OPS-02** | Centralized logging and monitoring to detect anomalies and ensure availability. | `charts/observability/` | `ls -l charts/observability/values.yaml` | Infrastructure as Code | SRE | Per PR |
| **OPS-03** | Formal process for code changes, including peer review, testing, and automated deployment (GitOps). | `.github/workflows/` | `ls -l .github/workflows/` | CI Job Logs | Maintainer | Per PR |
| **OPS-04** | Strategies and mechanisms to recover data and services in case of catastrophic failure. | `docs/runbooks/dr/` | `ls -l docs/runbooks/dr/` | Document | SRE | Static |
| **OPS-05** | Verification of software artifacts (SBOM, Signing) to prevent tampering. | `.github/workflows/reusable-golden-path.yml` | `grep "cosign sign" .github/workflows/reusable-golden-path.yml` | CI Job Logs | Release Manager | Per Release |
| **AI-01** | Tracking of model provenance, training data, and ethical usage guidelines. | `docs/ai/MODEL_GOVERNANCE.md` | `ls -l docs/ai/MODEL_GOVERNANCE.md` | Document | Model Oversight | Static |
| **REL-01** | A comprehensive, deterministic gate of tests and checks must pass before any GA release. | `.github/workflows/ga-release.yml` | `make ga` | `artifacts/ga/ga_report.md` | Release Manager | Per Release |
| **REL-02** | The GA release build process must be byte-for-byte reproducible. | `.github/workflows/ga-release.yml` | `pnpm verify:reproducible` | CI Job Logs | Release Manager | Per Release |
| **REL-03** | A standardized, immutable evidence bundle must be generated for each GA release. | `.github/workflows/ga-release.yml` | `pnpm build:release` | `dist/release/evidence-bundle.tar.gz` | Release Manager | Per Release |
| **RLB-01** | Services must pass a set of reliability checks to prevent common production failure modes. | `scripts/ci/reliability-lints.cjs` | `node scripts/ci/reliability-lints.cjs` | CI Job Logs | Maintainer | Per PR |

## Out of Scope for This System

*   Control effectiveness testing (penetration tests, audits)
*   Regulatory certification (SOC report issuance, ISO certification)
*   Runtime risk scoring beyond documented controls
