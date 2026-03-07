# Supply Chain Artifact Data Handling

## Never Log List
The following must never be written to logs or artifacts:
* Registry credentials
* OIDC tokens
* Private admission webhook payloads
* Private registry hostnames (unless explicitly redacted)

## Data Retention Policy
* **`report.json`**: Retain for 30 days. Contains deterministic trust decisions.
* **`metrics.json`**: Retain for 14 days. Performance, counting, and quality metadata.
* **`stamp.json`**: Retain for 7–14 days. Operational execution context. Should not be used for long-term audit logs.

## Rule
`stamp.json` is strictly operational metadata and must not be treated as long-lived evidence data.
