# VirusTotal Connector

## Setup
1. Add `virustotal.com` to egress allowlist.
2. Store `VT_API_KEY` in KMS.

## Limits
- Lookups per minute: 4 by default

## Example
```
$ node scripts/run-virustotal-fixture.js
```

