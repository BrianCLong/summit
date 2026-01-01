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

## Rollback decision gates (explicit)

Proceed with rollback **immediately** when **any** of the following are true:

- Health checks fail for >3 minutes after a deploy or config change.
- Error rate exceeds the SLO breach threshold for >5 minutes with no clear mitigation.
- Canary or stable pods are crash-looping, failing readiness probes, or violating SLO burn alerts.
- External dependencies are healthy, but Maestro errors/latency regress relative to the last known good version.

Hold rollback and continue investigation when:

- The regression predates the latest deploy.
- Downstream dependencies (DB, Redis, ingress) are in a known degraded state.

## Rollback execution

### Option A: GitHub Action (preferred for prod) — `.github/workflows/cd-rollback.yml`

1. Identify the last known good image tag (from `helm history` or release notes).
2. Trigger the workflow with the target environment and tag:
   ```bash
   gh workflow run cd-rollback.yml \
     -f environment=staging \
     -f image_tag=<good_tag>
   ```

   - The workflow logs into GHCR, pulls the requested tag, recreates `server`/`client` via Compose, and prunes unused images.
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

## Audit + evidence capture (required)

When using `scripts/rollback-deployment.sh`, provide evidence metadata and log links so the audit
trail is recorded automatically:

```bash
export DEPLOYMENT_LOG_URL="https://logs.example.com/deployments/<id>"
export ROLLBACK_REASON="canary health check failed"
export EVIDENCE_DIR="$PWD/evidence/rollbacks"
./scripts/rollback-deployment.sh rollback
```

- The script writes a JSON evidence record under `evidence/rollbacks/` and emits an audit event.
- Post the evidence path and `DEPLOYMENT_LOG_URL` in the incident or release channel.

## Staging rollback validation (controlled canary failure)

Run a monthly drill in **staging** to confirm rollback behavior:

1. Deploy a controlled bad canary (a tag with a failing `/health` endpoint or a deliberately throttled build):
   ```bash
   export NAMESPACE=intelgraph-staging
   export DEPLOYMENT_LOG_URL="https://logs.example.com/deployments/<id>"
   export ROLLBACK_REASON="staging canary drill"
   ./scripts/rollback-deployment.sh canary-deploy <bad_tag>
   ```
2. Confirm health checks fail and execute the rollback:
   ```bash
   ./scripts/rollback-deployment.sh canary-abort
   ```
3. Validate the evidence record and audit event exist, and link them in the staging release notes.

## Post-rollback validation

1. **Pods healthy**: `kubectl -n maestro get pods -l app=maestro-control-plane` shows all Ready.
2. **Traffic healthy**: `curl -fsSL https://maestro.intelgraph.ai/health` (or internal health check) returns 200 with `status: ok`.
3. **SLOs recover**: confirm alert clears and Grafana panels for availability/error rate return to baseline.
4. **Events/logs clean**: `kubectl -n maestro get events --sort-by=.metadata.creationTimestamp | tail -n 20`; check fresh logs for errors.
5. **Communicate**: update the incident channel and create a post-incident note referencing the image tag and revision rolled back.

## Escalation

- If rollback does not restore service within 10 minutes, escalate to platform on-call and database owners.
- If ingress remains unhealthy, engage the networking/ingress owner before retrying rollout.
