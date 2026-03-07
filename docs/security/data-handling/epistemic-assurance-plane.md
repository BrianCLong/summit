# Epistemic Assurance Plane: Data Handling

This outlines the data classification, retention, and handling policies for the Epistemic Assurance Plane.

## Classification

*   **Public**: URLs, source domain metadata, schema IDs.
*   **Internal**: Support scores, policy decisions, conflict metrics.
*   **Sensitive**: Raw snippets, analyst notes, source handles where reputationally risky.

## Never-Log List

The following elements must **never** be logged in plain text or written to unsecured destinations:
*   Full raw source text
*   Analyst override freeform notes
*   Private tokens
*   Credential-bearing URLs
*   User-entered PII

## Retention

*   **Deterministic Artifacts**: Retained indefinitely as proof of decision (e.g., `report.json`, `metrics.json`, `stamp.json`).
*   **Raw Source Payloads**: Subject to existing Summit data handling controls (short-term retention).
