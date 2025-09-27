# TAXII Connector

## Setup
1. Add TAXII server URL to egress allowlist.
2. Provide API token via KMS secret `TAXII_TOKEN`.

## Limits
- Default poll interval: 60s
- Rate limit: 60 requests/minute per tenant

## Example
```
$ node scripts/run-taxii-fixture.js
```

