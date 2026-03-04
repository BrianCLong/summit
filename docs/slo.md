# Summit Cloud Service Level Objectives (SLO)

## 1. Availability Objective

**Target:** 99.9% uptime per month.

- **SLI (Service Level Indicator):** Percentage of successful HTTP requests (status codes 2xx and 3xx) measured at the edge load balancer.

## 2. Latency Objective

**Target:** 95th percentile (p95) API response time < 200ms.

- **SLI:** Response time measured from request ingress to egress at the edge load balancer.

## 3. Error Budget & Policy

- **Monthly Budget:** 43 minutes of allowed downtime.
- **Enforcement:**
  - If error budget burn rate > 1x threshold: Warning alert to on-call engineers.
  - If error budget burn rate > 2x threshold: Automated deployment freeze. Feature releases blocked until budget recovers or an exception is approved.

## 4. Rollback Triggers

An automated deployment will be immediately rolled back if:

- Error rate > 0.5% for 5 consecutive minutes during a canary rollout.
- p95 latency exceeds 500ms for 5 consecutive minutes.
