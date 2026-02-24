# Data Handling: Safe Local Model Execution

## Data Classification
We use a three-tier classification for data processed by local models:
1. **Public:** No special handling required beyond standard sandbox.
2. **Internal:** Requires hardened sandbox.
3. **Restricted:** Requires ultra-hardened sandbox and explicit approval.

## Logging & Redaction
- Never log environment variables that may contain secrets.
- Sanitize stdout/stderr to redact common secret patterns.
- Receipts (`run.json`) must be deterministic and free of sensitive data.

## Retention
- Run receipts and logs are retained for 14 days by default.
- Restricted data outputs must be quarantined and shredded after use.
