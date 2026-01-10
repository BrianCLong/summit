# Roadmap Documentation Guide

This directory contains the **authoritative, offline** roadmap artifacts derived from external
PM systems. Because this environment is isolated, all updates flow through manual exports and
normalization steps documented below.

## Directory layout

- `STATUS.json` — current high-level initiative status and blockers.
- `OFFLINE_BACKLOG_MIGRATION.md` — canonical backlog schema and workflow.
- `DECISION_LOG.md` — compliance/ethics decision log (required when applicable).
- `PROVENANCE_LOG.md` — snapshot provenance template.
- `derived/` — generated summaries (counts, dependency maps, initiative rollups).

## Update checklist (required)

1. Confirm you have the latest exports and record hashes.
2. Run normalization tooling **offline** and sanitize output.
3. Update derived summaries under `derived/`.
4. Update `STATUS.json` with a revision note and timestamp.
5. Append entries to `PROVENANCE_LOG.md` and `DECISION_LOG.md` (if applicable).

## Provenance header template

```
Snapshot: YYYY-MM-DD
Sources: Linear export YYYY-MM-DD; Jira export YYYY-MM-DD; Notion export YYYY-MM-DD
Export hashes: <sha256>
Schema: v1
Prepared by: <name>
```

## Notes

- Do not commit raw exports.
- Keep all artifacts deterministic and reproducible.
- Escalate ambiguous compliance requirements to governance.
