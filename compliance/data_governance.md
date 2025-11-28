# Data Governance: Summit Reasoning Evaluator

## 1. PII & Sensitive Data
Reasoning traces often contain sensitive user data (PII) or proprietary logic. SRE enforces the following governance policies:

### 1.1. Ingestion Scanning
*   **Policy**: All raw traces must be scanned for PII (emails, SSNs, API keys) *before* persistence in the SRE graph store.
*   **Mechanism**: Pluggable `PIIScanner` middleware in the `Evaluator.evaluate_run` pipeline.
*   **Action**: Redact or hash sensitive tokens using `**REDACTED**` markers.

### 1.2. Proprietary Logic Protection
*   **Policy**: "Thought" nodes containing trade-secret reasoning strategies can be marked `CONFIDENTIAL`.
*   **Mechanism**: The SRE schema supports `metadata.confidential = true`.
*   **Action**: These nodes are excluded from exports/reports unless the user has `VIEW_CONFIDENTIAL` permissions.

## 2. Data Retention
*   **Raw Traces**: Retained for 30 days by default (configurable).
*   **Evaluation Reports**: Retained indefinitely as audit artifacts.
*   **Aggregated Metrics**: Retained indefinitely for longitudinal benchmarking.

## 3. Access Control (RBAC)
*   **Admin**: Full access to all traces and configs.
*   **Auditor**: Read-only access to Reports and Anonymized Graphs.
*   **Developer**: Read/Write access to their own experiment runs only.
