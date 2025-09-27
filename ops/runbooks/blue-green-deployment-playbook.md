# Blue-Green Deployment Playbook

This playbook documents the zero-downtime rollout process managed by Argo CD and Argo Rollouts for the Summit platform.

## 1. Prerequisites
- Argo CD ApplicationSet `companyos-environments` synced and healthy.
- Argo Rollouts controller >= v1.6 installed in the cluster.
- Ingress controller (NGINX) with preview hosts (`preview.api.<env>` / `preview.console.<env>`) resolvable.
- Access to Grafana, Prometheus, and tracing dashboards for live telemetry.
- `kubectl argo rollouts` plugin installed locally for rollout introspection.

## 2. Prepare the Release
1. Update container image tags in the appropriate Helm values file (`charts/companyos/values-<env>.yaml`).
2. Commit changes and let CI build/push the new images with immutable digests.
3. Validate preview ingress certificates (`kubectl get certificate -n companyos`).

## 3. Trigger the Deployment
1. In Argo CD, select the environment application (e.g., `companyos-prod`).
2. Press **Sync** with options `Prune`, `Self Heal`, and `Apply Only Out of Sync`. The sync applies the new Rollout manifest.
3. Watch rollout progress:
   ```bash
   kubectl argo rollouts get rollout intelgraph-api -n companyos --watch
   kubectl argo rollouts get rollout companyos-console -n companyos --watch
   ```
4. The controller will create the **preview** ReplicaSet and direct the preview ingress traffic to it while the active ingress keeps pointing to blue.

## 4. Validate the Green Environment
- Hit the preview URLs (e.g., `https://preview.api.topicality.co`) and run automated smoke tests.
- Check health metrics referenced by the `slo-analysis-template`:
  ```bash
  kubectl argo rollouts analysis get intelgraph-api-prepromotion -n companyos
  ```
- Confirm readiness probes are healthy and no errors are reported in Prometheus or Loki dashboards.

## 5. Promote Traffic
1. When validation passes, promote the rollout:
   ```bash
   kubectl argo rollouts promote intelgraph-api -n companyos
   kubectl argo rollouts promote companyos-console -n companyos
   ```
2. The controller updates service selectors so the active ingress now points to green.
3. Monitor post-promotion analysis automatically triggered by the rollout. Ensure success before considering the deployment complete.

## 6. Rollback Procedure
If any analysis metric fails or manual QA finds regressions:
1. Abort the rollout to automatically return traffic to the previous ReplicaSet:
   ```bash
   kubectl argo rollouts abort intelgraph-api -n companyos
   kubectl argo rollouts abort companyos-console -n companyos
   ```
2. Verify ingress has reverted to the blue pods (`kubectl argo rollouts get rollout ... --watch`).
3. Capture logs, raise an incident in Incident IQ, and open a remediation ticket.
4. Optionally, patch the ApplicationSet to pin the previous Helm chart version until the fix is prepared.

## 7. Post-Deployment Tasks
- Update status page and send release announcement.
- Archive rollout history for audit: `kubectl argo rollouts history intelgraph-api -n companyos`.
- Schedule the chaos validation suite (see `ops/chaos/blue-green-resiliency.yaml`).
- Rotate preview ingress weights back to `0` using `kubectl annotate ingress` if temporary canary weighting was applied.

## 8. Operational Tips
- Always keep at least one preview replica (`previewReplicaCount`) running so QA can validate before promotion.
- Use the `PruneLast` sync option to guarantee blue pods remain available until post-promotion analysis succeeds.
- Configure Alertmanager to page the on-call SRE if `argocd_app_sync_status` or rollout health alarms trigger during deployment.
- Document deviations and lessons learned in the release retro.
