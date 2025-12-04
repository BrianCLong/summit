# Alert Runbooks

This document contains remediation steps for common alerts in the IntelGraph platform.

## Application Alerts

### HighErrorRate
**Severity:** Critical
**Description:** Application error rate > 0.1 errors/s
**Remediation:**
1. Check application logs in Loki/Kibana.
2. Identify recent deployments or configuration changes.
3. Check database connectivity and status.
4. If related to a specific service, restart the service.
5. Escalate to Engineering Lead if unresolved after 15 minutes.

### HighGraphQLErrorRate
**Severity:** Warning
**Description:** GraphQL operation error rate > 5%
**Remediation:**
1. Identify which operation is failing (check alert labels).
2. Check logs for specific GraphQL errors (validation, auth, resolver).
3. If caused by bad client requests, contact client team.
4. If caused by backend failure, investigate resolver logic.

### HighLatency
**Severity:** Warning
**Description:** 95th percentile HTTP latency > 1s
**Remediation:**
1. Check CPU/Memory usage of API pods.
2. Check database query latency (`DatabaseSlow` alert).
3. Check external dependency latency (Redis, 3rd party APIs).
4. Scale up API replicas if CPU is high.

### DatabaseSlow
**Severity:** Warning
**Description:** 95th percentile DB latency > 500ms
**Remediation:**
1. Identify the database (Postgres, Neo4j, Redis).
2. Check for long-running queries in database logs or dashboard.
3. Check for lock contention.
4. Review recent query plans or schema changes.

## Business Alerts

### DropInSignups
**Severity:** Warning
**Description:** Zero signups in last hour
**Remediation:**
1. Verify signup page availability (synthetic checks).
2. Check auth service logs for errors.
3. Verify email sending service (SendGrid/SES).
4. Test signup flow manually.

### DropInRevenue
**Severity:** Warning
**Description:** Revenue rate dropped below threshold
**Remediation:**
1. Check payment gateway status (Stripe/etc).
2. Check for checkout errors in logs.
3. Verify pricing/billing service health.

## Infrastructure Alerts

### HighMemoryUsage
**Severity:** Critical
**Description:** Heap usage > 90%
**Remediation:**
1. Check for memory leaks in the application.
2. Check if load has increased significantly.
3. Restart the affected instance/pod to clear memory (short term).
4. Increase memory limit or investigate leak (long term).
