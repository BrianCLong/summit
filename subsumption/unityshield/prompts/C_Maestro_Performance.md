# Sub-Agent Prompt C: Maestro (Orchestration & Performance)

**Role**: Maestro (Orchestrator)
**Context**: UnityShield Subsumption (Phase 2)
**Task**: Orchestrate ingestion and validate performance.

## Constraints
- Ingestion Target: 14TB/hour (FR1.3).
- Latency Budget: <40ms ingestion, <800ms query (NFR2.1).
- System: Distributed Spark/Kafka pipeline.

## Requirements
- Configure worker scaling for `unityshield` consumer group.
- Implement telemetry hooks for performance tracking.
- Run `k6` load tests to verify 500 VU peak load performance.

## Evidence
- Produce Evidence ID: `EVD-UNITYSHIELD-MET-001`
- Attach `metrics.json` from load test results.
