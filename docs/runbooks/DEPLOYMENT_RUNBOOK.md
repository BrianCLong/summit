# Deployment & Release Runbook

## 1. Release Strategy (Envelope)
We utilize a progressive delivery strategy ("Canary Release") for all Tier-0 services to minimize blast radius.

### Stages
1.  **Stage 0: Internal/Seed (Smoke Test)**
    -   Target: Internal 'seed' tenant (e.g., `summit-internal`).
    -   Traffic: 0% real user traffic.
    -   Gate: Automated Smoke Tests (`make smoke`), DB Migration Check.

2.  **Stage 1: Canary (1-5%)**
    -   Target: Randomly sampled sessions (sticky by user ID).
    -   Traffic: 1% -> 5%.
    -   Gate: 15 minutes bake time. Error rate < 1%, Latency p95 < 1500ms.

3.  **Stage 2: Ramp (25% -> 50%)**
    -   Target: Broader user base.
    -   Traffic: 25% -> 50%.
    -   Gate: 30 minutes bake time.

4.  **Stage 3: Full Rollout (100%)**
    -   Target: All users.
    -   Action: Promote canary to stable. Delete old pods.

## 2. Rollback Procedure
**Trigger**: Sev-1 Alert (Error Rate > 5% or Latency > 2s) during rollout.

1.  **Stop the Line**: Pause rollout immediately.
2.  **Revert Traffic**: Switch 100% traffic back to `stable` version.
    ```bash
    kubectl rollout undo deployment/api-server
    ```
3.  **Verify Stability**: Check dashboards for error rate recovery.
4.  **Post-Mortem**: Create incident ticket. Do not re-deploy until root cause is fixed.

## 2.5. Release Channel Policy
Release channels (`rc`, `ga`) and their allowed source branches are configured in `release-policy.yml`.

Example configuration:
```yaml
channels:
  rc:
    allowed_from:
      - default-branch
    require_evidence: false
  ga:
    allowed_from:
      - default-branch
      - series-branch # e.g. release/v1.2
    require_evidence: false
```

- **rc**: Typically allowed only from `default-branch` (main).
- **ga**: Can be allowed from `series-branch` for LTS/Patch releases.
- **require_evidence**: If true, specific evidence artifacts must be present in the bundle.

## 3. Deployment Verification Tests (DVT)
Automated checks run after every traffic shift.

-   **Endpoint**: `/health` (Deep Check)
-   **Endpoint**: `/api/v1/user/me` (Auth Check)
-   **Synthetic**: Execute 1 "Golden Path" run (Ingest -> Search).

## 3.1 GA Deployment Commands (Summit)

```bash
# Production deploy (Helm)
./scripts/deploy-summit-production.sh deploy

# Production smoke tests
API_URL="https://summit.example.com" ./scripts/smoke-test-production.sh
```

## 4. Feature Flags
Use `LaunchDarkly` (or internal equiv) for feature-level rollouts independent of code deploys.
-   Naming: `feat-<ticket-id>-<name>`
-   Default: `False` (Off)
