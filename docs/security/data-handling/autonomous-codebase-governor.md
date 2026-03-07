# Autonomous Codebase Governor Data Handling Policy

## Classification
- source diff: confidential repo data
- dependency metadata: internal operational
- policy files: internal governance
- emitted reports: internal governance evidence

## Retention
- per-PR artifacts: 14 days
- nightly trend metrics: 90 days
- drift summaries: 180 days
- remediation previews: 14 days unless merged

## Never Log List
- secrets, tokens, env vars
- full repo snapshots
- raw package-manager auth config
- private issue bodies unrelated to current run
- opaque model chain traces containing sensitive code
