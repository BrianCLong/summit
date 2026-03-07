# Data Governance Policy

## 1. PII Handling

- **Requirement**: No Personally Identifiable Information (PII) shall be processed by the Auto-Scientist Generator.
- **Enforcement**: Input sanitization pre-hook.

## 2. Data Retention

- **Experiment Logs**: Retained for 7 years (regulatory requirement for R&D).
- **Telemetry**: Retained for 90 days.
- **WORM Storage**: All "Approved" hypotheses must be written to Write-Once-Read-Many storage (e.g., S3 Object Lock) for auditability.

## 3. Data Classification

- **Public**: General scientific knowledge.
- **Confidential**: Generated hypotheses (Company IP).
- **Restricted**: Safety critique logs (contains potential hazard info).
