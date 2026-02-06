# Agent Ops Tracing Architecture

## Summary
Agent ops tracing captures tool and agent lifecycle events, normalizes payloads,
and emits deterministic evidence bundles. This foundation mirrors the OMC hook
discipline while enforcing Summit governance requirements.

## Components
- `src/agents/ops/` — ops event types, allowlist, normalization, adapters.
- `src/agents/evidence/` — schemas, deterministic serializer, bundle writer.
- `.github/scripts/evidence-verify.mjs` — CI fixture verifier (deny-by-default).

## Data Flow
1. **Event ingestion**: hook payloads (snake_case or camelCase).
2. **Normalization**: map to canonical fields and reject unknown keys/types.
3. **Trace build**: generate stable IDs and summary report.
4. **Evidence bundle**: write deterministic report/metrics/stamp/index files.

## MAESTRO Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: event spoofing, secret leakage, non-deterministic
  output, strategy misuse.
- **Mitigations**: schema validation, allowlist enforcement, redaction,
  deterministic serialization, feature-flagged strategy profiles.

## Determinism Rules
- `report.json` + `metrics.json` exclude timestamps.
- Stable IDs use `(sessionId + index + type)`.
- Object keys are sorted before write.

## Evidence IDs
- Format: `EVD-OMC-<AREA>-<NNN>`
- Example: `EVD-OMC-TRACE-001`
