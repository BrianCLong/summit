# Evidence Collection for Compliance Audits

This document outlines the sources and methods for collecting evidence to support compliance audits (e.g., SOC2) for the CompanyOS platform.

## 1. Infrastructure-as-Code (Terraform)

**Purpose:** To demonstrate that infrastructure is defined, managed, and version-controlled, ensuring consistency and auditability.

**Evidence:**

- **Terraform Plan Outputs:** The output of `terraform plan` commands, showing proposed infrastructure changes.
  - **Collection Method:** Store `terraform plan` outputs as artifacts in CI/CD pipelines or as part of pull request comments.
- **Terraform State Files:** While sensitive, the structure and history of the state file (when stored securely, e.g., in S3 with versioning) can serve as evidence of deployed resources.
  - **Collection Method:** Access from the configured remote backend (e.g., S3 bucket history).
- **Terraform Code Repository:** The Git repository containing all `.tf` files.
  - **Collection Method:** Link to specific commits, branches, or tags in the Git repository.

## 2. CI/CD Artifacts

**Purpose:** To demonstrate that software changes are managed through a controlled process, including testing, security scanning, and approval workflows.

**Evidence:**

- **Build Logs:** Logs from successful and failed builds.
  - **Collection Method:** GitHub Actions workflow runs logs (`.github/workflows/build-and-push.yml`, `sbom.yml`).
- **Deployment Logs:** Logs from successful and failed deployments.
  - **Collection Method:** GitHub Actions workflow runs logs (`.github/workflows/deploy-eks.yml`, `release-prod.yml`).
- **SBOMs (Software Bill of Materials):** Generated lists of software components and their dependencies.
  - **Collection Method:** Artifacts from `sbom.yml` workflow runs.
- **Vulnerability Scan Reports:** Reports from security scanners (e.g., Grype, Trivy).
  - **Collection Method:** Artifacts from `sbom.yml` workflow runs.
- **Image Signatures:** Proof that container images are signed and verified.
  - **Collection Method:** `cosign verify` outputs, Kyverno policy reports (`k8s/policies/kyverno-require-cosign.yaml`).
- **Code Review History:** Evidence of peer review for code changes.
  - **Collection Method:** GitHub Pull Request history.

## 3. Audit Logs (IntelGraph API)

**Purpose:** To demonstrate that user and system activities are logged, providing an immutable record of who did what, when, and where.

**Evidence:**

- **API Access Logs:** Records of all requests made to the IntelGraph API.
  - **Collection Method:** Collected by OpenTelemetry Collector, stored in Loki, viewable in Grafana dashboards (`infra/observability/grafana/dashboards/trust.json`).
- **Authentication/Authorization Events:** Logs related to user logins, role assignments, and authorization failures.
  - **Collection Method:** Collected by OpenTelemetry Collector, stored in Loki, viewable in Grafana dashboards.
- **Data Modification Events:** Records of changes to critical data within the IntelGraph.
  - **Collection Method:** `recordArtifact` mutation in IntelGraph API, stored in PostgreSQL, viewable via direct database queries or custom reports.
- **System Events:** Logs related to infrastructure changes, deployments, and system health.
  - **Collection Method:** Kubernetes audit logs, EKS control plane logs, application logs (Loki), metrics (Prometheus).

## 4. Access Control Configuration

**Purpose:** To demonstrate that access to systems and data is restricted based on the principle of least privilege.

**Evidence:**

- **IAM Policies and Roles:** AWS IAM policies and roles for users, service accounts, and infrastructure components.
  - **Collection Method:** Terraform code (`infra/iam/`), AWS Console screenshots, AWS CLI outputs.
- **Kubernetes RBAC:** Role-Based Access Control configurations within Kubernetes.
  - **Collection Method:** Kubernetes YAML manifests, `kubectl get rolebinding` outputs.
- **IntelGraph API RBAC:** Role and permission definitions within the IntelGraph API.
  - **Collection Method:** IntelGraph API schema (`apps/intelgraph-api/schema/base.graphql`), database queries to `role` and `permission` tables.

## 5. Security Configuration

**Purpose:** To demonstrate that security best practices are applied to protect the system from unauthorized access and vulnerabilities.

**Evidence:**

- **Network Policies:** Kubernetes Network Policies restricting pod-to-pod communication.
  - **Collection Method:** Kubernetes YAML manifests (`k8s/hardening/`).
- **Kyverno/Gatekeeper Policies:** Admission control policies enforcing security standards.
  - **Collection Method:** Kubernetes YAML manifests (`k8s/policies/`).
- **TLS/SSL Certificates:** Evidence of valid and current TLS certificates for all public endpoints.
  - **Collection Method:** `cert-manager` resources, browser checks.
