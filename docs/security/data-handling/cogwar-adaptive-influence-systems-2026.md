# Data Handling Policy: CogWar Adaptive Influence Systems (2026)

## 1. Classification
- **Inputs:** Public JSONL (social posts), Internal Incident Logs (Confidential).
- **Outputs:** `report.json` (Confidential), `evidence.json` (Confidential).

## 2. Retention
- Raw Fixtures: Indefinite (as regression test).
- Live Analysis Inputs: 30 days.
- Derived Metrics: 1 year.

## 3. Never-Log List
- Usernames/Handles (unless hashed).
- Message Bodies (unless hashed or public domain).
- Precise Geolocation.
- IP Addresses.
- Authentication Tokens.

## 4. Redaction
All outputs must strip PII before persistent storage unless explicitly authorized for evidence collection in a secure enclave.

## 5. Compliance
- **Deny-by-default:** Logs are disabled unless explicitly enabled for debugging.
- **Audit:** All access to `evidence_bundles` is logged.
