# Claude Obsidian Evidence System (PR1)

This document defines the minimum evidence bundle contract and verifier for the Claude-in-Obsidian
lane-1 scaffold. It is intentionally read-only and deterministic.

## Contract

**Bundle location:** `evidence/bundles/<run_id>/`

**Required files**
- `report.json`
- `metrics.json`
- `stamp.json` (the only file allowed to carry timestamps)

**Index registration**
- Each bundle must appear in `evidence/index.json` with `report|metrics|stamp` paths.

**Default posture**
- `policy.write_enabled` must remain `false`.
- `mode` is `read_only` unless explicitly authorized by a future feature flag.

## Evidence IDs

- `EVD-CLAUDE-OBSIDIAN-EVID-001` — Schema scaffold baseline.
- `EVD-CLAUDE-OBSIDIAN-CI-002` — Evidence verifier gate wired.

## Verifier

Run:

```bash
pnpm -s node .github/scripts/evidence-verify.mjs
```

The verifier fails when:
- Any bundle is missing `report.json`, `metrics.json`, or `stamp.json`.
- Any JSON file is invalid.
- Any timestamp-like string appears outside `stamp.json`.
- Any evidence bundle lacks a matching index entry.
- `write_enabled` is true in a report.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Observability, Security.
- **Threats Considered:** prompt injection via evidence files, unauthorized writeback, timestamp leakage in logs.
- **Mitigations:** deny-by-default policy, timestamp isolation in `stamp.json`, deterministic verifier gate.

## Rollback

Disable the evidence gate by removing `.github/workflows/ci-evidence.yml` and revert the evidence
bundle entries in `evidence/index.json`.
