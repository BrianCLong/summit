# Runbook: RU-UA CogWar Lab Packs

## Purpose

Regenerate deterministic packs, verify drift, and respond to alerts for the RU-UA cogwar lab.

## Regenerate Packs

1. Run `node scripts/cogwar/compile_packs.mjs`.
2. Validate outputs in `dist/cogwar/`:
   - `packs.json` (deterministic ordering)
   - `metrics.json` (counts only; no timestamps)
   - `stamp.json` (content hash + schema version + git sha)

## Drift Alerts

- Drift is signaled by a hash change in `dist/cogwar/stamp.json`.
- Confirm changes are intentional by reviewing diff in `examples/cogwar/ru-ua/`.
- If unintentional, revert and re-run compilation.

## Incident Response

### Suspected PII Leakage

- Remove affected artifacts from storage.
- Re-run compilation after redacting content.
- File a governance incident and attach evidence references.

### Suspected Prompt Injection

- Inspect any indicator/report renderers for unescaped content.
- Rebuild reports using sanitized fields only.

## Rollback

- Revert changes to `examples/cogwar/ru-ua/`, `schemas/cogwar/`, and `dist/cogwar/`.
- Re-run `node scripts/cogwar/compile_packs.mjs` to restore deterministic outputs.
