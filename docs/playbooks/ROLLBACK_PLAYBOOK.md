# Rollback Playbook

**Status:** Stable
**Owner:** On-Call SRE
**Last Updated:** 2026-03-04

This playbook provides technical instructions for rolling back the IntelGraph platform to a known-stable state.

---

## 1. Rollback Decision Triggers

Rollback should be initiated if any of the following conditions are met during or immediately after a release:
- **Error Rate:** Sustained 5xx rate > 1% for 5 minutes.
- **Latency:** P99 API response time > 2s for core endpoints.
- **Data Integrity:** Detected corruption in primary databases (Postgres, Neo4j).
- **Security:** Verified breach or critical vulnerability exposure.
- **Critical Functionality:** Failure of core features (e.g., entity resolution, graph querying).

---

## 2. Technical Rollback Steps

### 2.1 Kubernetes (via Helm)
1. **Identify Revision:**
   ```bash
   helm history <release-name> -n <namespace>
   ```
2. **Execute Rollback:**
   ```bash
   helm rollback <release-name> <previous-revision> -n <namespace>
   ```
3. **Verify Pod Status:**
   ```bash
   kubectl get pods -n <namespace> -w
   ```

### 2.2 Database Migrations (Precautionary)
- **Forward-Only Rule:** GA releases follow a forward-only migration policy. Rollbacks should generally NOT involve reversing database schemas unless absolutely necessary and previously tested.
- **Reverse Migration:** Only if a destructive migration was applied:
  ```bash
  # Example for a hypothetical migration tool
  npm run migrate:down -- --to <target-version>
  ```
- **Read-Only Mode:** If data integrity is at risk, enable read-only mode via feature flag `DB_READ_ONLY: true`.

### 2.3 CDN and Edge Caching
- **Invalidation:** Flush CDN caches to ensure old assets are not being served.
  ```bash
  # Example for CloudFront
  aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
  ```

---

## 3. Post-Rollback Verification

Confirm the system has stabilized at the previous version.
1. **Health Check:** `GET /health` must return 200 OK.
2. **Version Check:** `GET /version` must return the previous stable version string.
3. **Metrics Analysis:** Verify error rates and latency have returned to baseline levels.

---

## 4. Incident Handling

1. **Declare Incident:** Open a P1 incident in PagerDuty/Slack.
2. **Root Cause Analysis (RCA):** Schedule a post-mortem within 24 hours.
3. **Release Freeze:** No further releases are permitted until the RCA is complete and the "bad" release is officially deprecated.

---

## 5. Failure-Specific Playbooks

### Scenario A: Persistent Error Spikes
- **Action:** Check pod logs for OOM (Out Of Memory) or connection timeouts. If the cause is not immediately apparent, roll back to the last green deployment.

### Scenario B: Database Connectivity Loss
- **Action:** Verify DB credentials and network policies. If the GA release included a breaking change to connectivity, roll back the application layer first.

### Scenario C: Performance Degradation
- **Action:** Check for inefficient queries or resource leaks. If P99 exceeds thresholds, roll back and investigate in a staging environment.
