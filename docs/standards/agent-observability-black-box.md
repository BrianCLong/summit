# Agent Observability: Black Box Instrumentation Standard

## Overview

This standard defines the "Observability-First" instrumentation layer for Summit agents. It captures:
1.  **Decision Provenance** (Audit Trail)
2.  **Agent State Snapshots**
3.  **Information Lineage**
4.  **Conflict Resolution Visibility**

## Core Claims (from ITEM)

*   **CLAIM-01**: "You can't debug what you can't see." We must capture structured visibility.
*   **CLAIM-02**: Traditional metrics fail for probabilistic MAS flows.
*   **CLAIM-03**: We track four dimensions: Decision, State, Lineage, Conflict.

## Schema

### Evidence ID
All observability artifacts for a run are keyed by a deterministic **Evidence ID**:
`SUMMIT-OBS-<sha256(run_inputs)[:16]>`

### Artifacts
*   `trace.jsonl`: Stream of `AgentSpan` and `DecisionEvent`.
*   `report.json`: Aggregated provenance report.
*   `metrics.json`: Performance and cost metrics.
*   `stamp.json`: Cryptographic seal (hash of trace + stable timestamp).

## Implementation
*   **Wrapper**: `ObservableAgent` wraps `agent.decide()`.
*   **Redaction**: Deny-by-default for sensitive fields.
*   **Determinism**: Artifacts must be bit-for-bit reproducible for identical inputs (excluding runtime logs).

## Usage
Import `summit.observability.evidence` to generate IDs.
Use `summit.observability.wrapper.ObservableAgent` to wrap your agent instances.
