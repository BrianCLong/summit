# Operator Checklist

Use this checklist for daily/weekly operational reviews and incident triage.

## 🟢 Daily Checks
- [ ] **System Health:** Check "System Overview" dashboard for all green indicators.
- [ ] **Alerts:** Review any firing alerts in Alertmanager.
- [ ] **Backups:** Confirm last night's DB snapshot succeeded.
- [ ] **Logs:** Check for spikes in `error` level logs in `summit-api` and `summit-worker`.

## 🟡 Weekly Checks
- [ ] **Capacity:** Review CPU/Memory trends. Scale node groups if utilization > 70%.
- [ ] **Disk Space:** Check PVC usage. Expand if > 80%.
- [ ] **Security:** Check for new container vulnerabilities (image scanning).
- [ ] **Cost:** Review cloud spend for anomalies.

## 🔴 Incident Response Triage
1. **Acknowledge:** Mark alert as acknowledged.
2. **Impact Assessment:** Is it total outage or degradation?
3. **Check Changes:** Was there a recent deployment?
   - *Yes:* Consider rollback (`kubectl rollout undo`).
4. **Check Logs:** `kubectl logs -l app=<component> --tail=200`
5. **Check Events:** `kubectl get events --sort-by=.lastTimestamp`
6. **Escalate:** Contact Summit Enterprise Support if unresolved within SLA.

## 🔗 Quick Links
- [Day 0: Planning](./day-0-planning.md)
- [Day 1: Deploy](./day-1-deploy.md)
- [Day 30: Operate](./day-30-operate.md)
- [Reference Architectures](../reference-architectures/)
