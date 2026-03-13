# GA Release and Rollback Runbook

**Purpose:** Provide a clean, operator-executable guide for deploying GA releases, verifying health, and executing rollbacks if necessary. This runbook is designed to be executed without tribal knowledge.

---

## 1. Preflight Checklist

Before initiating any deployment to Stage, verify the following prerequisites are met:

- [ ] **Branch Protection:** Target release branch (e.g., `main` or `release/vX.Y.Z`) has branch protection enabled and all required reviews approved.
- [ ] **CI Green:** Ensure the CI pipeline is passing for the commit to be deployed.
  ```bash
  gh run list --branch <release-branch> --workflow "CI" --limit 1
  # Expected output: "completed" and "success"
  ```
- [ ] **Test Coverage & Quality:** Lint, type checks, unit, e2e, and smoke tests have passed. Chaos dry-run has successfully completed without unexpected failures.
- [ ] **Evidence Artifacts Present:** Ensure all required SBOMs are generated, attached, and CVE scan results are below threshold.
  ```bash
  # Check SBOM and vulnerability scan artifacts
  gh release view <tag> --json assets
  ```
- [ ] **SLSA Provenance:** Cosign signatures and SLSA provenance have been verified.
- [ ] **Migration Check:** Pre-flight migration validator has passed and a fresh database backup has been taken.
- [ ] **Compliance & Policies:** Residency and retention policies are verified per tenant.
- [ ] **Readiness:** On-call schedule is set, and the rollback script has been rehearsed or is readily available.

---

## 2. Deploy Sequence

Deployments must follow a strict Stage -> Canary -> Prod progression. Do not bypass gates.

### Phase 1: Stage Deployment

1. **Verify Attestations Before Helm:**
   ```bash
   # Run verification script or workflow
   gh workflow run deploy-verify-attest.yml -f chart=maestro -f namespace=stage -f release=<version>
   ```
2. **Helm Upgrade (Stage):**
   ```bash
   helm upgrade --install maestro charts/maestro -n stage -f charts/maestro/values-staging.yaml --wait
   ```
3. **Stage Go/No-Go Gate:**
   - Wait 5 minutes.
   - Run Stage smoke tests: `./ops/post-deploy-smoke-tests.sh --env stage`
   - *Gate Decision:* If tests fail or errors spike, **STOP**. Rollback Stage and investigate. If pass, proceed to Canary.

### Phase 2: Canary Deployment (Production)

1. **Enable Blue/Green Rollouts:**
   ```bash
   helm upgrade -n maestro charts/maestro --set argoRollouts.enabled=true --set canary.weight=10 -f charts/maestro/values-prod.yaml
   ```
2. **Canary Validation:**
   - Monitor canary SLOs (k6):
     ```bash
     k6 run scripts/slo-canary.js -e TARGET_URL=https://canary.api.example.com
     # Thresholds: p95 < 700ms, p99 < 1.5s, error rate < 1%
     ```
3. **Canary Go/No-Go Gate:**
   - Observe canary traffic for 15 minutes.
   - *Gate Decision:* If PRR error rate > 1% or SLO burn rate > 2x budget, **AUTOMATIC ROLLBACK** triggers. Otherwise, manually promote.

### Phase 3: Full Production Promotion

1. **Promote Canary to Full Traffic:**
   ```bash
   kubectl argo rollouts promote maestro -n maestro
   ```
2. **Final Helm Upgrade (Pinning):**
   ```bash
   helm upgrade --install maestro charts/maestro -n maestro -f charts/maestro/values-prod.yaml --wait
   ```

---

## 3. Post-Deploy Validation Steps

Execute these steps immediately after full production promotion (T+5 minutes):

1. **Health Checks:**
   ```bash
   curl -f https://api.example.com/health || echo "API Unhealthy"
   ```
2. **Functional Smoke Tests:**
   ```bash
   # Core GraphQL queries
   curl -X POST https://api.example.com/graphql \
     -H "Content-Type: application/json" \
     -H "X-Tenant: system-check" \
     -d '{"query":"{ systemHealth { status } }"}'
   ```
3. **Evidence & Compliance Verification:**
   - Verify immutable audit (WORM) and evidence endpoints:
     ```bash
     curl -s https://api.example.com/api/compliance/export/signed | jq .
     ```
4. **Security & Identity Checks:**
   - Ensure mTLS is active and denying unauthorized sidecar bypasses.
   - Verify Gatekeeper policy bundles are enforcing signed images.

---

## 4. Rollback Procedure

**Priority: P0 - Critical System Recovery | Expected Time: < 5 mins**

### Signals to Rollback Immediately:
- Production error rate > 1% sustained for 5 minutes.
- SLO burn rate > 2x over budget for 10 minutes.
- Post-deploy Cosign verification failure or Gatekeeper policy breach.

### Step-by-Step Rollback Commands:

1. **Helm Rollback:**
   ```bash
   # Find the previous successful revision
   helm history maestro -n maestro

   # Rollback to the previous revision
   helm rollback maestro <previous-revision> -n maestro
   ```
2. **Argo Rollouts Switch Back (If using Blue/Green):**
   ```bash
   kubectl patch service maestro -p '{"spec":{"selector":{"version":"blue"}}}'
   ```
3. **Feature Flag Emergency Bypass (If code rollback is slow):**
   ```bash
   kubectl set env deployment/maestro PQ_PHASE=log PQ_BYPASS=1
   kubectl rollout status deployment/maestro --timeout=60s
   ```
4. **CDN Cache Busting:**
   ```bash
   # Invalidate edge caches if web assets changed
   curl -X POST https://api.cdn/purge \
     -H "Authorization: Bearer $CDN_TOKEN" \
     -d '{"paths":["/*"]}'
   ```
5. **Data Migrations Consideration:**
   - Migrations should be forward-only. If a backward-incompatible schema change caused the issue, activate read-only mode and execute `down.sql` *only if explicitly tested*. Otherwise, restore from backup:
     ```bash
     ./tools/db/pitr.sh --timestamp <pre-deploy-iso-timestamp>
     ```

### Post-Rollback:
- Verify health endpoints return 200 OK.
- Run `k6` canary tests on the previous version.
- File an incident ticket with timeline, logs, and Grafana snapshots.

---

## 5. Post-Release Monitoring Checklist

Monitor the system at these specific intervals post-deployment:

### First 1 Hour
- [ ] Watch Grafana `mtls-overview` and main application dashboards.
- [ ] Confirm Error Rate remains < 1% across all services.
- [ ] Check p95 and p99 API latencies are within SLO thresholds (<700ms and <1.5s respectively).
- [ ] Ensure DLQ (Dead Letter Queue) growth is nominal.
- [ ] Verify background workers (e.g., `reconcile` queue) are processing normally without buildup.

### 24 Hours
- [ ] Review daily error budgets and SLO burn rates.
- [ ] Check cost alerts to ensure no anomalous budget spikes from new features.
- [ ] Verify night-time jobs and database maintenance scripts executed successfully on the new version.
- [ ] Review customer support tickets for any newly reported edge-case bugs.

### 7 Days
- [ ] Analyze weekly operational snapshots for performance trends vs previous release.
- [ ] Confirm no gradual memory leaks (check Kubernetes memory usage trends for pods).
- [ ] Conduct a mini retrospective on the release process with the deployment team.
