# Maestro rollback and triage runbook

**Service**: Maestro control plane and UI

**Purpose**: Provide a concise map from symptoms to triage to rollback actions when Maestro alerts fire. Use this after any Maestro deployment or infra change that correlates with availability, latency, or error-rate regressions.

## Symptoms that trigger this runbook

- `MaestroServiceDown`, `MaestroIngressDown`, or load balancer health checks failing
- `MaestroHighErrorRate`, `MaestroAPIHealthDegraded`, or SLO burn alerts
- `MaestroHighLatency` / `MaestroHighLatencyP95`, or p95/p99 spikes on dashboards
- Deployment instability: pod restart loops, replica mismatches, or elevated resource alerts (CPU/memory)

## 10-minute triage (stabilize + gather evidence)

1. **Confirm recent change**
   - `kubectl -n maestro rollout history deployment/maestro-control-plane | tail -5`
   - `helm history maestro-control-plane -n maestro | tail -5`
2. **Check control plane health**
   - `kubectl -n maestro get deploy maestro-control-plane`
   - `kubectl -n maestro get pods -l app=maestro-control-plane -o wide`
   - `kubectl -n maestro logs deploy/maestro-control-plane --tail=200`
   - `kubectl -n maestro describe deploy/maestro-control-plane | tail -n 50`
3. **Validate ingress + endpoints**
   - `kubectl -n ingress-nginx get pods`
   - `curl -fsSL https://maestro.intelgraph.ai/health` (or the environment-specific health endpoint)
4. **Dependencies**
   - Database: `kubectl -n maestro logs statefulset/maestro-postgres --tail=50`
   - Redis: `kubectl -n maestro logs statefulset/maestro-redis --tail=50`
   - Queue depth: check Grafana panel `Maestro queue depth`
5. **Decide**: If the regression started immediately after a deploy or config change, proceed to rollback; otherwise continue investigation (logs, dashboards, traces).

## Rollback decision logic (fast path)

Proceed to rollback when **any** of the following are true:

- Canary error rate >2% sustained for 5 minutes **after** a release.
- p95 latency >2x baseline for 10 minutes **and** aligns with a deploy.
- Regression tied to a specific config/feature flag rollout and no mitigation exists.
- Health checks fail (two consecutive failures) after deployment.

Prefer **feature flag disable** if the impact is scoped to a single feature and the platform remains healthy; otherwise use rollback.

## Rollback execution

### Option A: GitHub Action (preferred for prod) — `.github/workflows/cd-rollback.yml`

1. Identify the last known good revision (from `helm history`) and the log URL.
2. Trigger the workflow with the target environment, reason, and evidence URL:
   ```bash
   gh workflow run cd-rollback.yml \
     -f service=maestro-control-plane \
     -f environment=staging \
     -f revision=<good_revision> \
     -f reason="SLO regression after release" \
     -f actor="$USER" \
     -f evidence_url="https://grafana.example.com/d/maestro?from=...&to=..."
   ```

   - The workflow records audit and evidence entries in `runs/audit/` and `evidence/rollbacks/`.
3. Monitor the workflow logs and proceed to post-rollback validation below.

### Option B: Helm rollback (cluster-admin)

```bash
# Inspect revisions
helm history maestro-control-plane -n maestro

# Roll back to the last good revision
helm rollback maestro-control-plane <REVISION> -n maestro --cleanup-on-fail

# If only the image needs reverting
helm upgrade maestro-control-plane oci://ghcr.io/intelgraph/maestro-control-plane \
  --namespace maestro \
  --reuse-values \
  --set image.tag=<good_tag>
```

### Option C: Kubernetes deployment rollback

```bash
kubectl -n maestro rollout history deploy/maestro-control-plane
kubectl -n maestro rollout undo deploy/maestro-control-plane --to-revision=<REVISION>
kubectl -n maestro rollout status deploy/maestro-control-plane --watch
```

## Post-rollback validation

1. **Pods healthy**: `kubectl -n maestro get pods -l app=maestro-control-plane` shows all Ready.
2. **Traffic healthy**: `curl -fsSL https://maestro.intelgraph.ai/health` (or internal health check) returns 200 with `status: ok`.
3. **SLOs recover**: confirm alert clears and Grafana panels for availability/error rate return to baseline.
4. **Events/logs clean**: `kubectl -n maestro get events --sort-by=.metadata.creationTimestamp | tail -n 20`; check fresh logs for errors.
5. **Communicate**: update the incident channel and create a post-incident note referencing the image tag and revision rolled back.

## Staging rollback validation (controlled canary failure)

1. Deploy a canary with a known bad image tag in **staging** (isolated test window).
2. Confirm canary monitors detect the failure (error rate/latency).
3. Trigger rollback via `cd-rollback.yml` with `--reason "staging canary failure"` and `--evidence-url` pointing to the staging logs.
4. Verify rollback success and store the evidence record path from `evidence/rollbacks/<rollback_id>/rollback-evidence.json`.
5. Document the run in the release log with the rollback ID and log URL.

## Escalation

- If rollback does not restore service within 10 minutes, escalate to platform on-call and database owners.
- If ingress remains unhealthy, engage the networking/ingress owner before retrying rollout.
