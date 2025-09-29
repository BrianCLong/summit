# MISP Connector

## Setup
1. Allowlist the MISP host.
2. Store `MISP_API_KEY` in KMS.

## Limits
- Poll interval: 5 minutes
- Rate limit: 30 requests/minute per tenant

## Example
```
$ node scripts/run-misp-fixture.js
```

