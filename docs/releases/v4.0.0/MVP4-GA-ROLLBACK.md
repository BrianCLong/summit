# MVP-4-GA Rollback Protocol

**Philosophy**: "Better to be down for 5 minutes and revert, than broken for 5 hours and debug."

---

## 1. Trigger Conditions (When to Pull the Cord)

Initiate **IMMEDIATE ROLLBACK** if:

1.  **Data Corruption**: Evidence of invalid writes or schema mismatches.
2.  **Auth Failure**: Users can access unauthorized data.
3.  **Global Outage**: 5xx Error Rate > 5% for > 5 minutes.
4.  **Latency Spikes**: P95 Latency > 2s for > 10 minutes (unrelated to load).
5.  **Security Breach**: Active exploitation detected.

---

## 2. The Rollback Mechanism

### Application Rollback

(Assuming Kubernetes/Helm)

1.  **Check Current Revision**:
    ```bash
    helm history summit-prod
    ```
2.  **Revert**:
    ```bash
    helm rollback summit-prod 0 # 0 = previous revision
    ```
3.  **Verify**:
    ```bash
    kubectl rollout status deployment/summit-server
    ```

### Database Rollback (The Hard Part)

_If schema migration `v4` ran, we must decide:_

- **Compatible?**: If `v4` added columns/tables, `v3` code might interpret them safely. -> **Just App Rollback**.
- **Incompatible?**: If `v4` renamed/deleted, we must restore DB.
  - **PITR (Point-in-Time Recovery)**: Restore to T-minus-1-second before migration.
  - **Down Migration**: Run `db:migrate:down` (Only if tested and confident).

**Default Stance**: Prefer **PITR** for serious data issues. Prefer **App Rollback** for logic bugs.

---

## 3. Communication Templates

**Status Page Update**:

> "We have detected an issue with the latest release. We are currently rolling back to the previous stable version. No data loss is expected."

**Internal Comms**:

> "ALERT: MVP-4-GA Rollback Initiated. Reason: [Reason]. Incident Commander: [Name]. Join War Room: [Link]."

---

## 4. Post-Rollback

1.  **Lock Deployment**: Freeze CI/CD to prevent auto-promotion.
2.  **Snapshot Logs**: Capture logs from the failed pods for analysis.
3.  **Post-Mortem**: Root cause analysis required before re-attempt.
