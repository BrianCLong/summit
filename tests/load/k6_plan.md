# k6 Load Plan

## Goals
Validate GA Core performance under mixed workloads with cost guard and policy enforcement enabled.

## Scenarios
1. **Mixed query**: 60% graph reads, 20% writes, 20% copilot NL→Cypher previews.
2. **Connector spike**: burst ingest from 10 connectors with freshness checks.
3. **Export stress**: selective disclosure exports with manifest verification in loop.
4. **Chaos under load**: run pod/broker kill while sustaining workload.

## Targets
- RPS: 100 sustained, 150 peak for 10 minutes.
- Latency: p95 <1.5s for graph queries; preview median <500ms.
- Error budget: <0.1% failed due to system errors (policy denials excluded).
- Cost guard: zero unbudgeted executions; blocked attempts logged.

## Success Criteria
- All scenarios complete without SLO burn alerts breaching thresholds.
- Audit hash chain intact; manifests validate post-test.
- Resource utilization within planned budgets; no sustained throttling after test.
