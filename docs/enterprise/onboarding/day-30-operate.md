# Day 30: Operate & Scale

## Objectives
- Establish operational routines.
- Configure advanced monitoring.
- Plan for upgrades.
- Conduct DR drills.

## 1. Monitoring & Alerting
- **Metrics:** Ensure Prometheus is scraping Summit metrics endpoints (`/metrics`).
- **Dashboards:** Import the standard Summit Grafana Dashboards.
- **Alerts:** Configure alerts for:
  - High Error Rate (> 1%).
  - High Latency (p95 > 500ms).
  - Low Disk Space (< 20% free).

## 2. Backup Verification
- Verify that automated RDS snapshots are occurring.
- Verify S3 replication status.
- **Action:** Perform a test restore of the database to a non-production environment.

## 3. Incident Management
- Define an incident response process.
- Integrate PagerDuty/OpsGenie if available.
- Review the [Operator Checklist](./operator-checklist.md).

## 4. Upgrades
- Subscribe to Summit Release Notes.
- Plan to upgrade continuously (monthly/quarterly).
- **Procedure:**
  1. Test upgrade in Staging (`stage-secure` overlay).
  2. Run regression tests.
  3. Promote to Production (`prod-secure` overlay).

## 5. DR Drill
- Simulate a region failure or data corruption.
- Execute the Disaster Recovery Plan.
- Measure RTO (Recovery Time Objective).

## Success Criteria
- Monitoring is active and alerting correctly.
- Backups are proven to be restorable.
- Operational team is confident in handling incidents.
