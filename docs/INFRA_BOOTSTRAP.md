# Infrastructure Bootstrap & Golden Paths

This guide documents the "Day-0" infrastructure setup and the standardized "Golden Path" CI/CD workflows established for the IntelGraph platform.

## 1. Environments

We use three standard environments, defined by Helm values in \`charts/intelgraph-api/\`:

*   **Dev (\`values.dev.yaml\`)**:
    *   Optimized for cost and speed.
    *   1 Replica, reduced resources (50m CPU).
    *   No canary rollouts.
*   **Stage (\`values.stage.yaml\`)**:
    *   Prod-like environment for validation.
    *   2 Replicas, moderate resources.
    *   Simple canary (50/50 split).
*   **Prod (\`values.prod.yaml\`)**:
    *   High Availability.
    *   3+ Replicas, full resources.
    *   Advanced progressive delivery (20% -> 40% -> 80% -> 100%) with automated analysis.

## 2. CI/CD Golden Paths

New workflows in \`.github/workflows/\` standardize the delivery pipeline:

1.  **\`golden-ci.yml\`**: Runs on PRs.
    *   Linting, Unit Tests, Integration Tests.
    *   Security Scan (Trivy).
    *   SBOM Generation (CycloneDX).
2.  **\`golden-build.yml\`**: Runs on Main/Tag.
    *   Builds Docker image.
    *   Signs image with Cosign.
    *   Pushes to GHCR with immutable tags (\`sha\`, \`semver\`).
3.  **\`golden-preview.yml\`**: Runs on PR.
    *   Deploys ephemeral environment \`pr-<ID>\`.
    *   Comments URL back to PR.
4.  **\`golden-deploy.yml\`**: Runs on Tag.
    *   Deploys to Stage.
    *   Runs Smoke Tests.
    *   Promotes to Production (after manual approval/gate).

## 3. Observability

SLOs are defined as code in \`observability/slos/intelgraph-api-slo.yaml\`:
*   **Availability**: 99.9% success rate.
*   **Latency**: p99 < 500ms.
*   **Alerts**: Burn rate alerts are configured to trigger before budget exhaustion.

## 4. Bootstrapping (Terraform)

To stand up a new environment (e.g., Dev), use \`terraform/bootstrap/main.tf\`:

\`\`\`bash
cd terraform/bootstrap
export TF_VAR_db_password="change_me"
terraform init
terraform apply
\`\`\`

This provisions the EKS cluster, VPC, Database, and Monitoring stack (Prometheus/Grafana).
