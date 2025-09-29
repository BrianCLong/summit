# Sprint 8 Test Plan

## Media Precheck
- Upload allowed MIME type returns features.
- Upload disallowed MIME type is rejected and file removed.
- Flagged media sets `quarantined` flag.

## Quarantine Flow
- Quarantined media never written to graph.
- Audit log masks `features` fields.

## GraphRAG SLOs
- Retry logic performs up to 3 attempts with jitter.
- Timeout increments `graphrag_timeouts_total` metric.
