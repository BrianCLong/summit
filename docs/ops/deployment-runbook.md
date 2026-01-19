# Deployment Runbook

## Overview
This runbook covers the deployment, rollback, and verification procedures for the Summit Cloud environment.

## Deployment Procedure
Deployments are automated via GitHub Actions (`.github/workflows/deploy-cloud.yml`).

1. **Trigger**: Push to `main` (for dev) or manual `workflow_dispatch` (for stage/prod).
2. **Infrastructure**: Terraform applies changes to the target environment.
3. **Application**: Kubernetes manifests are applied to the EKS cluster.
   - Image tags are substituted with the commit SHA.
   - Secrets are referenced from K8s Secrets (managed externally or via SealedSecrets).

## Rollback Procedure
If a deployment fails or introduces critical bugs:

1. **Revert Commit**: Revert the bad commit in Git.
2. **Deploy Previous SHA**: Use `workflow_dispatch` to deploy the previous known good SHA.
   - Select the target environment.
   - The pipeline will re-apply infrastructure and the previous application version.

## Verification
After deployment:

1. **Check Pod Status**:
   ```bash
   kubectl get pods -n default
   ```
   Ensure all pods are `Running` and `Ready`.

2. **Check Logs**:
   ```bash
   kubectl logs -l app=summit -n default
   ```
   Look for startup errors.

3. **Verify Access**:
   - Access the LoadBalancer URL found via `kubectl get svc summit-service`.

## Evidence
Deployment evidence is stored in `artifacts/deploy/<env>/<sha>/stamp.json`.
This artifact proves:
- What was deployed (SHA)
- Where (Environment)
- When (Timestamp)
