# Runbook: High DLQ Rate

**Alert:** `HighDLQRate`

**Severity:** Critical

**SLO:** DLQ Rate should be 0.

---

### Summary

This alert fires when any message is sent to a Dead-Letter Queue (DLQ). This indicates that the message could not be processed by the consumer and requires manual intervention.

### 1. Initial Triage

1.  **Acknowledge the alert immediately.** This is a critical alert indicating data processing failure.
2.  **Check the `IntelGraph / Kafka` Grafana dashboard.** Identify which DLQ topic is receiving messages (`intelgraph.dlq.social_ingest`, etc.).
3.  **Triage the impact:** How many messages are in the DLQ? Is the number growing rapidly?

### 2. Diagnostics

*   **Inspect the DLQ messages:** Consume a sample of messages from the DLQ topic. The message payload should contain the original message and the reason for the failure (e.g., schema validation error, processing exception).
*   **Analyze the failure reason:**
    *   **Schema Validation Error:** This is a critical issue. It means a producer is sending data that does not conform to the schema. Identify the producer and investigate why it's sending invalid data. This may require a code rollback or a hotfix.
    *   **Processing Exception:** The consumer code is failing to process a valid message. Check the consumer logs for stack traces corresponding to the failed messages.

### 3. Remediation

*   **For Schema Validation Errors:**
    *   **Block the producer:** If possible, temporarily revoke publish ACLs for the offending producer to prevent more poison pills from entering the system.
    *   **Deploy a fix:** The producer must be fixed and redeployed.
    *   **Decide on DLQ messages:** The messages in the DLQ may need to be manually corrected and re-published, or they may be discarded if the data is not critical.

*   **For Processing Exceptions:**
    *   **Deploy a fix:** The consumer code must be fixed and redeployed.
    *   **Drain the DLQ:** Once the consumer is fixed, a DLQ drain process can be initiated to re-process the failed messages.

*   **Escalate:** Escalate to the owning team of the producer or consumer that is causing the issue.
