# Streaming Platform GA Readiness

## Explicit Non-Goals

To ensure system stability and predictability, the following are explicitly **out of scope** or **prohibited**:

1.  **Silent Retries:** All retries must be observable (metrics) and eventually bounded (DLQ).
2.  **Auto Schema Coercion:** We strictly enforce schema compatibility. No "best effort" parsing of incompatible data.
3.  **Unbounded Buffering:** Consumers must pause or backpressure if downstream is slow; they must not buffer indefinitely in memory.

## Ownership & On-Call

| Module | Owner Team | Escalation |
|Str|Team|Path|
|---|---|---|
| **Streaming Core** | Platform / Infra | @platform-oncall |
| **CDC (Debezium)** | Data Engineering | @data-eng-oncall |
| **Airflow** | Data Engineering | @data-eng-oncall |
| **Observability** | SRE | @sre-oncall |

## GA Checklist (GO / NO-GO)

- [ ] **Schema Compatibility:** Registry enforces BACKWARD compatibility.
- [ ] **Load Test:** System sustains 100k events/sec for 1 hour without lag growth.
- [ ] **DLQ Invariants:** No data is lost; failed messages appear in DLQ within 5 seconds.
- [ ] **Resilience:** Redis restart does not cause consumer crash loop (handled gracefully).
- [ ] **Observability:** Dashboards are receiving data and alerts are configured.
- [ ] **Runbooks:** Runbooks verified in Game Day exercise.

## Status

**Current State:** READY FOR LOAD TESTING
**Next Step:** Execute `server/scripts/streaming-load-test.ts` in Staging.
