# Data Handling: Agentic Human Outsourcing

## 1. Overview
This document outlines the data handling requirements for any interactions involving potential human outsourcing by AI agents.

## 2. PII Protection
- **Do not log** any Personally Identifiable Information (PII) of gig workers or contractors.
- **Do not store** payment details or transaction identifiers related to human task execution in plain text.
- Any worker identity must be anonymized or tokenized before storage.

## 3. Evidence Retention
- Logs of attempted outsourcing (flagged by `HumanOutsourcingDetector`) are retained for **30 days** in the Causality Ledger.
- Aggregated statistics are retained for **1 year**.

## 4. Audit Trail
- All flagged events must be traceable via Evidence ID (e.g., `EVID-AHO-XXXX`).
- Access to detailed logs is restricted to the Security and Governance teams.

## 5. Third-Party Data
- Data received from external hiring platforms (if any integration exists) must be treated as **Confidential**.
- No data from these platforms should be used for model training without explicit consent.
