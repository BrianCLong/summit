# Unity Package Data Handling

## Classification

Unity package manifests are configuration metadata and are treated as internal engineering data.

## Logging Constraints

Never log:

- Authentication tokens
- Private registry credentials
- Absolute local filesystem paths

## Retention

- `package-report.json`, `metrics.json`, `stamp.json`: 30 days
- Drift trend data (future monitoring): 90 days
