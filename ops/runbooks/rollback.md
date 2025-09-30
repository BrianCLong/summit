# Argo Rollout Evidence Gate Rollback Playbook

This playbook documents the automatic rollback triggers and on-call steps for the API rollout that now gates promotions on Mission Control (MC) evidence checks.

## Automatic rollback triggers

- **MC evidence gate failure** – the `mc-evidence-ok` analysis template halts promotion whenever the evidence API returns `ok=false`. The failure message surfaces the reason provided by MC so operators know what evidence is missing or invalid.
- **SLO regression** – the `ig-slo-checks` template still enforces latency and error rate thresholds. Breaching either metric causes the rollout to abort.

When either trigger fires, Argo Rollouts aborts the canary, scales traffic back to the stable ReplicaSet, and posts the failure reason in the AnalysisRun status. With the current step durations (≤180s) the controller completes rollback in under five minutes without manual intervention.

## On-call response checklist

1. **Confirm rollback status**
   ```bash
   kubectl argo rollouts get rollout api -n <namespace>
   ```
   Ensure the rollout status reports `Degraded` with the analysis failure reason and that the stable revision matches the previous release.

2. **Inspect evidence details**
   ```bash
   kubectl argo rollouts get analysisrun -n <namespace> --selector rollout=api
   kubectl get analysisrun <name> -n <namespace> -o jsonpath='{.status.metricResults[*]}'
   ```
   Look for the `mc-evidence-ok` metric output, including the `failureMessage` propagated from MC.

3. **Validate release identity** – the canary pods are labeled with `release-id=${RELEASE_ID}`. Confirm the release ID that failed matches the evidence payload before retrying.

4. **Remediate and re-run**
   - Resolve the evidence gap in Mission Control (e.g., attach missing test reports).
   - If the failure was due to SLO regression, investigate service metrics and apply fixes.
   - Once corrected, re-run the promotion:
     ```bash
     kubectl argo rollouts retry api -n <namespace>
     ```

5. **Escalation** – if rollback loops or the service remains degraded, escalate to the deployment lead and SRE within 15 minutes, providing the evidence failure reason and relevant dashboard screenshots.

## Rollback verification before close-out

- Stable pods should have the previous image tag and continue to report healthy probes.
- Mission Control should show the prior release as the current production evidence bundle.
- Update incident or change tickets with the failure cause, remediation, and link to the relevant AnalysisRun summary.
