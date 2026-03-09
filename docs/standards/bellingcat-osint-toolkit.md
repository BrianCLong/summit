# Bellingcat OSINT Toolkit MWS Standard

This standard defines the Minimum Working Slice (MWS) for deterministic, offline-first media verification workflows inspired by Bellingcat verification patterns.

## Scope

- Deterministic workflow execution with no live network calls by default.
- Evidence bundle outputs: `report.json`, `provenance.json`, `metrics.json`, and `stamp.json`.
- Normalized tool registry records validated against `src/toolkit/schema.json`.

## Normative Requirements

1. Network policy is deny-by-default.
2. Any `mode: live` step is blocked when `policy.network: deny`.
3. Connector calls are blocked unless explicitly allowlisted.
4. Evidence IDs MUST use `EVID-<YYYYMMDD>-<sha256_8>`.
5. Deterministic files MUST avoid wall-clock timestamps.
6. JSON outputs MUST use stable key sorting and deterministic list ordering.
