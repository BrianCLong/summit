# Summit Swarm Evidence

This directory defines the evidence requirements for Summit Swarm execution.

## Evidence IDs

*   `EVD-CLAUDE-SWARM-ARCH-001`: Architecture snapshot
*   `EVD-CLAUDE-SWARM-POLICY-001`: Policy decision log and fixtures
*   `EVD-CLAUDE-SWARM-RACE-001`: Concurrency integrity test report
*   `EVD-CLAUDE-SWARM-REPLAY-001`: Deterministic replay proof

## Artifacts

Each run must produce:
*   `report.json`: Structured summary
*   `metrics.json`: Performance and cost metrics
*   `stamp.json`: Deterministic run stamp (timestamps allowed here ONLY)
