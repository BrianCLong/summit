# SOC2 Control Matrix Mapping for CompanyOS

This document maps common SOC2 Trust Services Criteria (TSC) to the technical controls implemented within the CompanyOS platform.

## TSC CC1 - Control Environment

| SOC2 Control                                                         | CompanyOS Technical Control                  | Implementation Details                                      | Evidence Links/References                                                                |
| -------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **CC1.1** - Demonstrates commitment to integrity and ethical values. | **Code of Conduct, Contributing Guidelines** | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` in repository root. | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), [CONTRIBUTING.md](../../CONTRIBUTING.md) |

## TSC CC2 - Communication and Information

| SOC2 Control                                                | CompanyOS Technical Control                | Implementation Details                                     | Evidence Links/References                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **CC2.1** - Communicates information to achieve objectives. | **Documentation, Runbooks, Release Notes** | `docs/`, `GO-LIVE.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`. | [GO-LIVE.md](../../GO-LIVE.md), [docs/compliance/evidence_collection.md](../compliance/evidence_collection.md) |

## TSC CC3 - Risk Assessment

| SOC2 Control                               | CompanyOS Technical Control                      | Implementation Details                                                         | Evidence Links/References                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CC3.1** - Specifies objectives clearly.  | **Superprompt, OKRs, KPI Dashboards**            | Defined in initial Superprompt, tracked via `charts/observability` dashboards. | [charts/observability/values.yaml](../../charts/observability/values.yaml), [infra/observability/grafana/dashboards/exec.json](../../infra/observability/grafana/dashboards/exec.json)           |
| **CC3.2** - Identifies and analyzes risks. | **Threat Modeling, Risk Matrix, Security Scans** | `RISK_MATRIX.md`, `SBOM/Grype` in CI, `k8s/policies/kyverno-hardening`.        | [RISK_MATRIX.md](../../RISK_MATRIX.md), [k8s/policies/kyverno-hardening/](../../k8s/policies/kyverno-hardening/), [docs/compliance/evidence_collection.md](../compliance/evidence_collection.md) |

## TSC CC4 - Control Activities

| SOC2 Control                                         | CompanyOS Technical Control                    | Implementation Details                                         | Evidence Links/References                                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CC4.1** - Selects and develops control activities. | **CI/CD Pipelines, Kyverno Policies, AuthN/Z** | `.github/workflows/`, `k8s/policies/`, IntelGraph API AuthN/Z. | [.github/workflows/](../../.github/workflows/), [k8s/policies/](../../k8s/policies/), [apps/intelgraph-api/src/schema.ts](../../apps/intelgraph-api/src/schema.ts) |

## TSC CC5 - Monitoring Activities

| SOC2 Control                                         | CompanyOS Technical Control                   | Implementation Details                                                                          | Evidence Links/References                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CC5.1** - Evaluates and communicates deficiencies. | **Observability Stack, Alerting, Audit Logs** | `charts/observability`, `infra/observability/prometheus-rules.yaml`, IntelGraph API audit logs. | [charts/observability/](../../charts/observability/), [infra/observability/prometheus-rules.yaml](../../infra/observability/prometheus-rules.yaml), [infra/observability/grafana/dashboards/trust.json](../../infra/observability/grafana/dashboards/trust.json) |

## TSC CC6 - Information Security

| SOC2 Control                                     | CompanyOS Technical Control                 | Implementation Details                                                 | Evidence Links/References                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CC6.1** - Implements security policies.        | **Kyverno Policies, Network Policies, IAM** | `k8s/policies/kyverno-hardening`, `k8s/hardening/`, AWS IAM roles.     | [k8s/policies/kyverno-hardening/](../../k8s/policies/kyverno-hardening/), [k8s/hardening/](../../k8s/hardening/), [infra/iam/](../../infra/iam/)                                                           |
| **CC6.2** - Implements change management.        | **GitOps, CI/CD, Immutable Deployments**    | ArgoCD/Helmfile, `.github/workflows/`, image digests.                  | [deploy/argocd/](../../deploy/argocd/), [deploy/helmfile/](../../deploy/helmfile/), [.github/workflows/](../../.github/workflows/)                                                                         |
| **CC6.3** - Implements logical access controls.  | **Tenant-safe AuthN/Z, RBAC, IRSA**         | IntelGraph API JWT/RBAC, AWS IRSA.                                     | [apps/intelgraph-api/src/schema.ts](../../apps/intelgraph-api/src/schema.ts), [apps/intelgraph-api/src/lib/context.ts](../../apps/intelgraph-api/src/lib/context.ts), [infra/iam/](../../infra/iam/)       |
| **CC6.4** - Implements network access controls.  | **VPC, Security Groups, Network Policies**  | `infra/eks-baseline/terraform`, AWS Security Groups, `k8s/hardening/`. | [infra/eks-baseline/terraform/](../../infra/eks-baseline/terraform/), [k8s/hardening/](../../k8s/hardening/)                                                                                               |
| **CC6.5** - Implements data encryption.          | **RDS Encryption, S3 Encryption, TLS**      | `infra/aws/rds-postgres`, `infra/aws/neo4j-backup`, `cert-manager`.    | [infra/aws/rds-postgres/](../../infra/aws/rds-postgres/), [infra/aws/neo4j-backup/](../../infra/aws/neo4j-backup/), [scripts/clusterissuer-letsencrypt.yaml](../../scripts/clusterissuer-letsencrypt.yaml) |
| **CC6.6** - Implements data backup and recovery. | **Velero, RDS PITR, Neo4j S3 Snapshots**    | `charts/velero`, `infra/aws/rds-postgres`, `infra/aws/neo4j-backup`.   | [charts/velero/](../../charts/velero/), [docs/runbooks/dr/](../../docs/runbooks/dr/)                                                                                                                       |

## TSC CC7 - System Operations

| SOC2 Control                                | CompanyOS Technical Control              | Implementation Details                                                                 | Evidence Links/References                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CC7.1** - Manages system operations.      | **Observability, Alerting, Runbooks**    | `charts/observability`, `infra/observability/prometheus-rules.yaml`, `docs/runbooks/`. | [charts/observability/](../../charts/observability/), [infra/observability/prometheus-rules.yaml](../../infra/observability/prometheus-rules.yaml), [docs/runbooks/](../../docs/runbooks/) |
| **CC7.2** - Manages system vulnerabilities. | **SBOM/Grype, Security Scans, Patching** | `sbom.yml` workflow, regular image updates.                                            | [.github/workflows/sbom.yml](../../.github/workflows/sbom.yml), [docs/compliance/evidence_collection.md](../compliance/evidence_collection.md)                                             |

## TSC CC8 - Change Management

| SOC2 Control                                   | CompanyOS Technical Control                    | Implementation Details                           | Evidence Links/References                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **CC8.1** - Manages changes to infrastructure. | **Terraform, GitOps**                          | `infra/`, ArgoCD/Helmfile.                       | [infra/](../../infra/), [deploy/argocd/](../../deploy/argocd/), [deploy/helmfile/](../../deploy/helmfile/)                     |
| **CC8.2** - Manages changes to software.       | **CI/CD, Code Reviews, Immutable Deployments** | `.github/workflows/`, GitHub PRs, image digests. | [.github/workflows/](../../.github/workflows/), [docs/compliance/evidence_collection.md](../compliance/evidence_collection.md) |

## TSC CC9 - Risk Mitigation

| SOC2 Control                                           | CompanyOS Technical Control                 | Implementation Details                                            | Evidence Links/References                                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CC9.1** - Mitigates risks from vendors.              | **Supply Chain Security (Cosign, Kyverno)** | `build-and-push.yml`, `k8s/policies/kyverno-require-cosign.yaml`. | [.github/workflows/build-and-push.yml](../../.github/workflows/build-and-push.yml), [k8s/policies/kyverno-require-cosign.yaml](../../k8s/policies/kyverno-require-cosign.yaml) |
| **CC9.2** - Mitigates risks from business disruptions. | **DR Plan, Multi-AZ, Backups**              | `docs/runbooks/dr`, RDS Multi-AZ (optional), Velero.              | [docs/runbooks/dr/](../../docs/runbooks/dr/), [infra/aws/rds-postgres/](../../infra/aws/rds-postgres/), [charts/velero/](../../charts/velero/)                                 |
