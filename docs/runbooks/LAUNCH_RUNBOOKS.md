# Launch Operations Runbooks

## 1. On-Call Rotation & Escalation

**Primary On-Call**: `schedule-primary-sre` (PagerDuty)
**Secondary On-Call**: `schedule-secondary-dev`
**Exec Escalation**: `cto-emergency-line`

**Escalation Policy:**

1.  **ACK** within 15m.
2.  **Resolve** or **Escalate** to Secondary within 30m.
3.  **Exec Escalate** if customer impact > 1h.

---

## 2. Specific Runbooks

### SLA Breach Response (Error Rate > 1%)

**Trigger**: Prometheus Alert `HighErrorRate` > 1% for 5m.

**Steps**:

1.  Check `SystemHUD` dashboard for specific failing service.
2.  Check `scripts/launch_day_simulation.ts` logs if running.
3.  **Rollback**: If caused by recent deployment, execute `make rollback`.
4.  **Shed Load**: If traffic spike, enable aggressive rate limiting via `launch-guards` feature flag.
    ```bash
    summitctl flags set launch-guards true --tenant=global
    ```
5.  **Status Page**: Update status.summit.com.

### Billing Dispute Resolution

**Trigger**: Customer ticket or support escalation.

**Steps**:

1.  Verify usage in `QuotaManager` logs (`server/src/lib/resources/quota-manager.ts`).
2.  Cross-reference with `ProvenanceLedger`.
3.  If discrepancy found, issue credit and flag for `post-launch-audit`.

### Data Residency Violation

**Trigger**: `RegionMismatch` alert from Compliance Service.

**Steps**:

1.  Identify tenant ID.
2.  Check configured region vs. actual data storage location.
3.  **Containment**: Suspend tenant write access immediately.
    ```bash
    summitctl tenant suspend <tenant_id> --reason="residency-check"
    ```
4.  **Remediation**: Initiate migration job to correct region.

### Kill-Switch Activation

**Objective**: Sever all external access in case of catastrophic compromise.

**Steps**:

1.  **Approval**: Requires CEO or CTO verbal confirmation.
2.  **Execute**:
    ```bash
    # Blocks all incoming traffic at Gateway
    ./scripts/emergency/kill_switch_activate.sh
    ```
3.  **Verify**: External probes should timeout or 503.

---

## 3. Launch Readiness Drill Report

See `docs/drills/LAUNCH_DRILL_REPORT.md` for results of the latest simulation.
