# Deployment Quick Start Guide

This guide covers the procedures for deploying the Summit Platform (IntelGraph) across different environments.

For configuration details, see [Environment Configuration Reference](./ENV-CONFIG.md).
For issues, see [Troubleshooting Runbook](./TROUBLESHOOTING.md).

## 1. Prerequisites Checklist

Before you begin, ensure your local or CI environment has the following tools installed:

- **Node.js**: Version 18.18 or higher
- **Docker**: Latest version (Desktop or Engine)
- **kubectl**: For interacting with Kubernetes clusters
- **Helm**: Version 3.x for chart management
- **Git**: For version control

Verify installations:

```bash
node --version
docker --version
kubectl version --client
helm version
```

## 2. Local Development Setup

To run the platform locally for development:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Infrastructure Services (Postgres, Neo4j, Redis, etc.):**
    ```bash
    npm run docker:dev
    ```
    *Note: This runs `docker-compose -f docker-compose.dev.yml up`.*

3.  **Start Application Servers (API + Client):**
    ```bash
    npm run dev
    ```

    - **Frontend:** http://localhost:3000
    - **API:** http://localhost:4000
    - **Neo4j Browser:** http://localhost:7474
    - **Grafana:** http://localhost:8080 (mapped to host)

## 3. Preview Environment Deployment

Preview environments are ephemeral deployments triggered by Pull Requests.

To manually deploy a preview environment using Helm:

```bash
# Update dependencies
helm dependency update charts/ig-platform

# Install/Upgrade the preview release
helm upgrade --install preview charts/ig-platform \
  --set global.env=preview \
  --set ingress.host=preview.summit.local \
  --namespace preview --create-namespace
```

## 4. Canary Deployment to Staging

Canary deployments allow us to test new features with a subset of traffic. This is typically handled by our CI/CD pipelines (GitHub Actions).

**Triggering a Canary Deployment:**

1.  Create a release tag:
    ```bash
    git tag v1.1.0-rc.1
    git push origin v1.1.0-rc.1
    ```
2.  The `canary-deployment.yml` workflow will automatically trigger.

**Manual Verification:**
Check the canary health endpoints or logs via the CI console.

## 5. Production Rollout Procedure

Production deployments are gated and require approval.

1.  **Trigger Release:**
    Merge the release candidate into `main` or create a production tag (e.g., `v1.1.0`).

2.  **Approval Gate:**
    Go to GitHub Actions -> `deploy-production` workflow.
    Review the plan and click **Approve** if all checks pass.

3.  **Monitoring:**
    Watch the deployment progress in the Actions log.
    Verify health status via Grafana Dashboards or the `/health` endpoint.

## 6. Rollback Procedure

If a critical issue is detected post-deployment:

**Automated Rollback:**
The CI pipeline is configured to auto-rollback if the smoke tests fail immediately after deployment.

**Manual Rollback (Helm):**

```bash
# List history
helm history production -n production

# Rollback to previous revision (e.g., revision 5)
helm rollback production 5 -n production
```

## 7. Common Troubleshooting

| Issue | Check | Resolution |
| :--- | :--- | :--- |
| **Ports in Use** | `lsof -i :<port>` | Stop conflicting services or change ports in `.env`. Common ports: 3000 (UI), 4000 (API), 5432 (PG). |
| **Permission Denied** | File ownership | Run `sudo chown -R $USER:$USER .` or check Docker volume permissions. |
| **Container Crashing** | `docker logs <container>` | Check for missing env vars or DB connection failures. |
