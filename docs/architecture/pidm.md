# Predictive Inverse Dynamics Models (PIDM)

## Purpose

PIDM reframes agent action selection as a two-stage process: predict a plausible next state and then
infer the action that best moves the system toward that state. This reduces ambiguity in intent and
keeps decisioning resilient under noisy or delayed execution channels.

## Summit Concept Mapping

| PIDM Concept | Summit Concept |
| --- | --- |
| State (s) | Enterprise context snapshot (GraphRAG retrieval set, KG neighborhood IDs, user intent, constraints, system status) |
| Action (a) | Tool invocation or API call (GraphQL/REST, connector ops, graph writes) |
| Future state (s') | Coarse goal-oriented delta hints (e.g., `kg:node_added`, `report:generated`) |
| Inverse dynamics | Policy choosing the next tool/action that moves from s → s' |

## Privacy Constraints

- Agent state must exclude raw user content by default.
- Action payloads must be hashed before storage (`inputHash` only).
- Evidence artifacts must contain metrics and summaries only; timestamps belong solely in
  `stamp.json`.

## Feature Flag + Rollout

- Feature flag: `PIDM_POLICY_ENABLED=false` by default.
- When the flag is off, PIDM must deny and fall back to existing policy logic.
- Any allow path requires explicit allowlist + verifier attestation.

## Evidence Artifacts

PIDM evidence is stored under `evidence/pidm/` and indexed by `evidence/pidm/index.json`.
Each evidence ID must provide:

- `report.json` (human-readable summary; no timestamps)
- `metrics.json` (numeric metrics only; no timestamps)
- `stamp.json` (timestamps allowed only here)

The CI verifier enforces layout and timestamp hygiene.

## Observability Hooks

Emit structured audit events for every PIDM decision:

- Flag state
- Decision outcome
- Action kind/name (no payload)
- Reason for denial

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**: prompt injection, tool abuse, unsafe action inference, privacy leakage
- **Mitigations**: deny-by-default policy, coarse state schema, hash-only action inputs, evidence
  verification gate
