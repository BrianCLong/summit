# Staging Rollback Playbook

This playbook documents the procedure to safely roll back the **CompanyOS staging environment** when a deployment triggered by the staging automation fails synthetic validation or breaks downstream consumers. It aligns with the ArgoCD GitOps patterns introduced in the staging deployment pipeline (Workstream 5).

## 1. Situational Awareness

1. Confirm the failing build in GitHub Actions (`Staging Deployment Pipeline`). Capture the workflow run URL and the commit SHA that was deployed.
2. Inspect ArgoCD for the `companyos-stage` application:
   - `argocd app get companyos-stage`
   - Review the `Sync Status`, `Health`, and the most recent `HISTORY` entry.
3. Collect pod-level diagnostics:
   - `kubectl get pods -n companyos-stage`
   - `kubectl describe pod/<name> -n companyos-stage`
   - `kubectl logs <pod> -n companyos-stage`

## 2. Immediate Containment

1. **Freeze** further promotions by disabling workflow runs (`Actions → Staging Deployment Pipeline → Disable`) or by adding a temporary branch protection rule for `develop`.
2. If the deployment is actively causing incidents (e.g., runaway traffic), scale replicas to zero while the rollback is prepared:
   ```bash
   kubectl scale deployment intelgraph-api -n companyos-stage --replicas=0
   kubectl scale deployment companyos-console -n companyos-stage --replicas=0
   ```

## 3. Roll Back via ArgoCD

1. Identify the last known good revision:
   ```bash
   argocd app history companyos-stage
   ```
2. Roll back to a specific revision (replace `<REVISION>` with the desired `ID` column value):
   ```bash
   argocd app rollback companyos-stage <REVISION>
   ```
3. Alternatively, reset to the previous commit’s Helm values:
   ```bash
   PREV_SHA=$(git rev-list --max-count=1 HEAD^)
   argocd app set companyos-stage \
     --helm-set intelgraph-api.image.tag="${PREV_SHA::7}" \
     --helm-set companyos-console.image.tag="${PREV_SHA::7}" \
     --helm-set mc-runner.image.tag="${PREV_SHA::7}"
   argocd app sync companyos-stage --prune
   ```
4. Wait for the application to return to `Healthy`:
   ```bash
   argocd app wait companyos-stage --timeout 600 --health
   ```

## 4. Post-Rollback Validation

1. Re-run the synthetic checks locally or from a runner:
   ```bash
   API_BASE=https://api.stage.topicality.co ./ops/post-deploy-smoke-tests.sh
   ```
2. Confirm that staging monitors (Grafana, alerting) have cleared and budgets remain within thresholds.
3. Announce the rollback in `#ops-alerts` with:
   - Commit reverted
   - Reason for rollback
   - Next steps / owners

## 5. Follow-Up Actions

1. File an incident report in the tracking system with the workflow URL and diagnostics.
2. Update the deployment workflow if additional gates or tests are needed.
3. Once fixes are validated, re-enable the staging pipeline and execute a fresh deployment from the corrected commit.
