# Collaborative Intelligence War Rooms

**Status:** Proposed MVP (Replacement for #141)
**Data Classification:** Sensitive (Private Org Policy Data, Config Values)

## Scope and Capabilities

This document supersedes the abandoned #141 epic and restricts War Room scope to a single end-to-end mission path using the IntelGraph Core Schema v1. It deliberately omits real-time video, general chat, and live collaboration in favor of reproducible deterministic evidence gathering.

### Definition of Done (MVP)

- An IntelGraph Core Schema v1 JSON artifact containing valid entities and edges.
- A deterministic `report.json` containing the findings of a single pattern miner.
- Validated evidence paths mapping to an `EVID:CIV:<module>:<scenario>:<nnnn>` reference.

## Data Handling & Retention

- **Internal/Sensitive Data:** Environment variables, API tokens, webhook secrets MUST NOT be logged.
- **Metrics Retention:** The CI workflow retains `metrics.json` and `report.json` for up to 90 days.
- **Evidence IDs:** Generated deterministically and do not contain PII or secrets.

## Threat Model & Policy

1. **Secret Leakage:** Prevented by CI secret scanning guardrails; fake AWS keys in fixtures should fail tests.
2. **Miner Overreach:** Deny-by-default execution policy; experimental miners are disabled without `FEATURE_PATTERN_MINER_EXPERIMENTAL=true`.
3. **Artifact Integrity:** The CI gate asserts `stamp.json` fields do not mutate `report.json` hash.
