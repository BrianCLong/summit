# SYNINT OSINT Capability (Summit)

## Scope

This module provides a **thin, governed integration layer** for calling SYNINT as an external
OSINT capability and normalizing results into Summit's graph ingestion abstractions. The
integration is intentionally constrained: it enforces policy, validates targets, and emits
an audit-style event for evidence-first workflows.

## Data Flow

1. GraphQL mutation `runSynintSweep(target)` validates the target and enforces purpose.
2. `SynintClient` invokes SYNINT over HTTP (default) or CLI.
3. `SynintMapper` normalizes findings into `GraphMutation[]` and emits an
   `osint.sweep.completed` event with a **sensing-only** posture.
4. Resolver applies allowlisted node/edge/event writes to Neo4j.

## Configuration

Set these variables in `server/.env` (see `server/.env.example`):

- `SYNINT_MODE` (`http` | `cli`) — default `http`.
- `SYNINT_URL` — HTTP base URL, e.g. `http://synint-osint:8080`.
- `SYNINT_TIMEOUT_MS` — request timeout in ms.
- `SYNINT_CONCURRENCY` — client concurrency ceiling (reserved for future batching).
- `SYNINT_PYTHON` — CLI python binary when `SYNINT_MODE=cli`.
- `SYNINT_ENTRYPOINT` — CLI entrypoint when `SYNINT_MODE=cli`.

## Governance Notes

- **Sensing-only**: output is intentionally constrained to observation-level data; no reasoning.
- **Evidence-first**: raw agent findings remain attached to the sweep payload.
- **Allowlists**: only allowlisted labels, edge types, and event types are persisted.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse.
- **Mitigations**: strict target validation, policy enforcement, allowlisted graph writes,
  and explicit audit-event emission for downstream monitoring.
