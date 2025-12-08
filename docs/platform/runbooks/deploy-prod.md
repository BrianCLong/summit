# Runbook: Deploying to Production

## Pre-requisites
1.  Changes merged to `main` and verified in `staging`.
2.  CI checks passed (Green).

## Procedure

### 1. Create Release Tag
Create a semantic version tag (e.g., `v1.2.3`).

```bash
git tag v1.2.3
git push origin v1.2.3
```

### 2. Approval
The GitHub Action `deploy-prod` will trigger. Go to the Actions tab and approve the deployment to the `prod` environment.

### 3. Verification
*   Check the #release channel for notification.
*   Verify `/health` endpoint on `api.summit.com`.
*   Check Grafana dashboards for error rate spikes.

## Rollback
If issues are detected:

1.  Find the previous working tag (e.g., `v1.2.2`).
2.  Run the manual rollback workflow in GitHub Actions, specifying `v1.2.2`.
3.  Verify the service stabilizes.
