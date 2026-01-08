# Evidence Index

This document provides audit-ready links to evidence for each control. Use the "Verification Command" to validate the control's existence in the codebase or runtime environment.

| Control ID | Control Name | Evidence Type | Location / Artifact | Verification Command / Instruction |
| :--- | :--- | :--- | :--- | :--- |
| **GOV-01** | Code of Conduct | Document | `CODE_OF_CONDUCT.md` | `ls -l CODE_OF_CONDUCT.md` |
| **GOV-02** | Documentation Standards | Document Structure | `docs/` | `ls -R docs/` |
| **RISK-01** | Risk Assessment | Document | `docs/risk/RISK_LEDGER.md` | `ls -l docs/risk/RISK_LEDGER.md` |
| **SEC-01** | Access Control | Source Code | `server/src/middleware/auth.ts` | `grep "function ensureAuthenticated" server/src/middleware/auth.ts` |
| **SEC-01** | Access Control (Schema) | Source Code | `apps/intelgraph-api/src/schema.ts` | `grep "@auth" apps/intelgraph-api/src/schema.ts` |
| **SEC-02** | Network Security | Terraform Config | `infra/eks-baseline/terraform/main.tf` | `grep "aws_security_group" infra/eks-baseline/terraform/main.tf` |
| **SEC-03** | Data Encryption (Trans) | K8s Manifest | `infra/eks-baseline/terraform/clusterissuer.yaml` | `cat infra/eks-baseline/terraform/clusterissuer.yaml` |
| **SEC-03** | Data Encryption (Rest) | Terraform Config | `infra/aws/rds-postgres/main.tf` | `grep "storage_encrypted" infra/aws/rds-postgres/main.tf` |
| **SEC-04** | Vulnerability Mgmt | CI Workflow | `.github/workflows/ci-security.yml` | `cat .github/workflows/ci-security.yml` |
| **SEC-04** | Scanning Config | Config File | `.github/workflows/ci-security.yml` | `cat .github/workflows/ci-security.yml | grep trivy` |
| **SEC-05** | Secret Management | Verification Script | `.gitignore` | `grep ".env" .gitignore` |
| **OPS-01** | Incident Response | Document | `docs/ops/INCIDENT_RESPONSE.md` | `ls -l docs/ops/INCIDENT_RESPONSE.md` |
| **OPS-02** | Observability | Helm Chart | `charts/observability/values.yaml` | `ls -l charts/observability/values.yaml` |
| **OPS-03** | Change Management | CI Workflow | `.github/workflows/deploy-multi-region.yml` | `cat .github/workflows/deploy-multi-region.yml` |
| **OPS-04** | Disaster Recovery | Runbook | `docs/runbooks/dr/` | `ls -l docs/runbooks/dr/` |
| **OPS-05** | Supply Chain Security | CI Workflow | `.github/workflows/reusable-golden-path.yml` | `grep "cosign sign" .github/workflows/reusable-golden-path.yml` |
| **REL-01** | Release Validator | Script | `scripts/releases/ga_validate.ts` | `ls -l scripts/releases/ga_validate.ts` |
| **REL-02** | GA Evidence Bundle | Artifact Directory | `artifacts/ga-evidence/` | `ls -R artifacts/ga-evidence/` |
| **AI-01** | Model Governance | Document | `docs/governance/MODEL_GOVERNANCE.md` | `ls -l docs/governance/MODEL_GOVERNANCE.md` |
