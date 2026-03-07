# GA Game Day Scenario

**Date**: T-Minus 2 Weeks (Wednesday)
**Duration**: 4 Hours
**Goal**: Validate Resilience, Alerting, and Rollback processes.

## Scenario 1: The "Bad Deploy" (1 Hour)

**Injection**: Deploy a version of the API where the `/login` endpoint returns 500s for 10% of requests.
**Expected Response**:

1.  Canary metrics detect error rate spike (> 1%).
2.  Automated Rollback triggers within 5 minutes.
3.  Alert fires to PagerDuty.
4.  Status Page updates automatically (if hooked) or manually.

## Scenario 2: The "DB Failover" (1 Hour)

**Injection**: Terminate the Primary PostgreSQL instance (or simulate connection failure).
**Expected Response**:

1.  Connection pooler detects failure.
2.  Standby promoted to Primary (Automatic or Manual < 5m).
3.  App reconnects. Brief error spike (< 1m).

## Scenario 3: The "Vendor Outage" (1 Hour)

**Injection**: Block egress traffic to OpenAI/LLM Provider.
**Expected Response**:

1.  Copilot requests fail gracefully (Circuit Breaker opens).
2.  UI shows "AI Unavailable" but Graph/Search still works.
3.  Alert fires "Dependency Down".

## Scenario 4: "Data Corruption" (Simulated) (1 Hour)

**Injection**: Ingest a "Poison Pill" dataset that violates schema.
**Expected Response**:

1.  Ingestion pipeline rejects batch to Dead Letter Queue.
2.  Main graph remains uncorrupted.
3.  Alert fires "DLQ High Watermark".
