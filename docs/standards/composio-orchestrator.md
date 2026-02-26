# Composio-Inspired Orchestrator Standard (Summit)

## Scope

Define Summit's deterministic, policy-governed DAG execution slice for multi-agent workflows without claiming full Composio parity.

## MAESTRO Alignment

- MAESTRO Layers: Agents, Tools, Security, Observability, Infra
- Threats Considered: agent privilege escalation, tool abuse, cyclic execution, nondeterministic outputs
- Mitigations:
  - deny-by-default cross-agent tool policy per edge
  - cycle rejection before execution
  - deterministic topological order and stable artifact serialization
  - explicit evidence ID contract (`SUMMIT-ORCH-XXXX`)

## Contract

- Input: workflow DAG (`nodes`, `edges`) and agent executor registry
- Policy: edge-level gate must approve cross-agent tool handoff
- Output artifact triad:
  - `artifacts/report.json`
  - `artifacts/metrics.json`
  - `artifacts/stamp.json`
- Determinism:
  - Stable key ordering in JSON
  - Stable execution ordering
  - No unstable timestamps in emitted artifacts

## Feature Flag

- `SUMMIT_ORCHESTRATOR_V1`
- Default: OFF
- Behavior: engine fails closed when flag is not enabled

## Interop Mapping

| Feature | Import | Export | Non-Goal |
| --- | --- | --- | --- |
| Multi-agent DAG | In-memory workflow object (DSL can compile into this) | Deterministic artifact triad | Full Composio parity |
| Tool orchestration | Summit local agent executors and policy gate | Stable policy decision outcomes | Remote execution fabric |
| Replayability | Re-run same DAG with same executors/inputs | Identical `report.json` hash | Cross-cluster distributed replay |

## Acceptance Gates

- DAG cycles are rejected before any node executes
- Unauthorized cross-agent tool edge is blocked
- Replays produce identical `report.json` and report hash
- Evidence IDs match `SUMMIT-ORCH-XXXX`
