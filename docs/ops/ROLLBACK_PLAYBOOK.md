# Rollback Playbook

## 1. Triggers

A rollback is triggered when any of the following occur after a deployment:
1.  **P1 Alert:** High Error Rate (> 1%) or critical infrastructure failure.
2.  **P2 Alert:** High Latency (> 500ms P95) persisting for > 15 minutes.
3.  **Functional Regression:** Critical user journey (e.g., Login, Search) is broken.
4.  **Security Incident:** Vulnerability discovered in the new release.

## 2. Rollback Procedure

### Step 1: Verification
Confirm the issue is caused by the new deployment and not an external factor (e.g., downstream vendor outage).

### Step 2: Identify Safe Version
Identify the last known good image tag (e.g., `v1.2.3`).
```bash
kubectl rollout history deployment/server
```

### Step 3: Execute Rollback
Revert the deployment to the previous revision.
```bash
kubectl rollout undo deployment/server
```
Alternatively, if using GitOps/ArgoCD, revert the commit in the configuration repository.

### Step 4: Verification
Verify system health after rollback:
1.  Check Pod status: `kubectl get pods`
2.  Check Error Rates in Grafana.
3.  Perform a Smoke Test: `make smoke-test`

## 3. Post-Rollback

1.  **Evidence Collection:** Save logs and metrics from the failed release period.
2.  **Incident Report:** Create a post-mortem using the template in `docs/ops/POSTMORTEM_TEMPLATE.md`.
3.  **Fix & Reland:** Fix the root cause in a new PR, add regression tests, and redeploy.

## 4. Drills

To ensure readiness, run a simulated rollback drill:
```bash
make rollback-drill
```
This will simulate a failure and generate an evidence artifact without touching production.
