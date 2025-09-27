# Production Readiness Review (PRR) for IntelGraph GA

**Date:** August 28, 2025

**Reviewers:** [To be filled by review team]

**Status:** [PASS/FAIL/CONDITIONAL]

---

## 1. Executive Summary

This document serves as the Production Readiness Review for the IntelGraph platform's General Availability (GA) launch. It outlines the critical aspects of our operational readiness, covering capacity, dependencies, runbooks, escalation procedures, data governance, and change management. Evidence links are provided where applicable.

## 2. Must-Green Criteria & Evidence

### 2.1. Capacity & Headroom

*   **Load Model:** Documented expected, peak, and soak load models.
    *   _Evidence:_ [Link to Load Test Results / K6 Reports]
*   **2x Headroom Proof:** Demonstrated ability to handle 2x peak load for 24 hours.
    *   _Evidence:_ [Link to Soak Test Results]
*   **Consumer Lag Curves:** Stable consumer lag under load.
    *   _Evidence:_ [Link to Grafana Dashboard: Consumer Lag]
*   **WebSocket Client Concurrency:** Verified WebSocket client capacity.
    *   _Evidence:_ [Link to Grafana Dashboard: WebSocket Metrics]

### 2.2. Dependencies & SLO Contracts

*   **Key Dependencies:** Kafka, Redis, Neo4j, PostgreSQL, Object Storage (MinIO).
*   **Upstream SLOs:** Documented SLOs for all critical upstream dependencies.
    *   _Evidence:_ [Link to Upstream SLO Documentation]
*   **Backoff/Retry Policy:** Documented and implemented backoff/retry policies for external calls.
    *   _Evidence:_ [Link to Codebase / Design Docs]

### 2.3. Runbooks

All critical runbooks are documented and accessible to on-call teams.

*   **High Ingest to Graph Latency:** `monitoring/runbooks/high_ingest_to_graph_latency.md`
*   **Low Alert Fan-Out Success Rate:** `monitoring/runbooks/low_alert_fan_out_success_rate.md`
*   **High DLQ Rate:** `monitoring/runbooks/high_dlq_rate.md`
*   **KMS Key Rotation and PII Backfill:** `monitoring/runbooks/key_rotation_and_backfill.md`
*   **Streaming Alerts GA (E2E Latency, Lag, Duplicates):** `monitoring/runbooks/streaming_alerts_ga.md` (To be created)
*   **Export Governance (Overscope, Missing Reason):** `monitoring/runbooks/export_governance.md` (To be created)
*   **PITR Restore:** [Link to PITR Restore Runbook]
*   **Canary Rollback:** [Link to Canary Rollback Runbook]

### 2.4. Escalation

*   **On-Call Rota:** Defined and published on-call rotation schedule.
    *   _Evidence:_ [Link to PagerDuty/Opsgenie Schedule]
*   **PagerDuty Services:** Configured services and escalation policies.
    *   _Evidence:_ [Link to PagerDuty Service Configuration]
*   **Slack War-Room:** Dedicated Slack channels for incident response.
    *   _Evidence:_ [Link to Slack Channels]
*   **SEV Policy:** Clearly defined Severity (SEV) levels and response protocols.
    *   _Evidence:_ [Link to Incident Management Policy]
*   **Incident Templates:** Standardized incident communication and resolution templates.
    *   _Evidence:_ [Link to Incident Templates]

### 2.5. Data Governance

*   **Retention Map:** Defined retention policies for all data classes.
    *   _Evidence:_ `server/src/governance/policy.ts`
*   **PII Tags & Redaction Paths:** PII identified, tagged, and redaction/tokenization applied at ingestion.
    *   _Evidence:_ `server/data-pipelines/governance/privacy.py`, `ingestion/main.py`
*   **Export Appeal Workflow:** Process for appealing denied data exports.
    *   _Evidence:_ [Link to Export Appeal Process Documentation]

### 2.6. Change Management

*   **Release Notes:** Comprehensive release notes for each deployment.
    *   _Evidence:_ [Link to Release Notes]
*   **Rollback Plan:** Documented and tested rollback procedures for all major components.
    *   _Evidence:_ [Link to Rollback Playbook]
*   **Feature-Flag Table:** Centralized management of feature flags.
    *   _Evidence:_ [Link to Feature Flag System]
*   **DB Down-Migrations Tested:** Verified ability to roll back database schema changes.
    *   _Evidence:_ [Link to Migration Test Results]

## 3. Automation

*   `make ga-validate`: Comprehensive GA validation suite.
    *   _Evidence:_ [Link to CI/CD Pipeline Run]
*   `make stream-validate`: Streaming alerts validation suite.
    *   _Evidence:_ [Link to CI/CD Pipeline Run]
*   `make evidence-bundle ENV=stage`: Command to generate a bundle of all required evidence artifacts.
    *   _Evidence:_ [Link to Evidence Bundle Generation Script]

## 4. Reviewer Sign-off

**SRE Lead:** _________________________ Date: _________

**Security Lead:** _________________________ Date: _________

**Compliance Lead:** _________________________ Date: _________

**Product Lead:** _________________________ Date: _________

**Engineering Lead:** _________________________ Date: _________
