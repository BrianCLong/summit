# Summit Automation Evidence

This directory defines the deterministic evidence contract for automation runs.
Automations must emit exactly three evidence files per run:

- `report.json`: human-readable findings summary (no timestamps).
- `metrics.json`: counters, decisions, and runtime metrics (no timestamps).
- `stamp.json`: the only location for timestamps.

## Evidence IDs

- `EVD-CODEX-AUTOMATIONS-SCHEMA-001`: Evidence schemas and example bundle.

## Schema Index

- `schemas/report.schema.json`
- `schemas/metrics.schema.json`
- `schemas/stamp.schema.json`
- `schemas/index.schema.json`

## Evidence Index Example

```json
{
  "EVD-CODEX-AUTOMATIONS-SCHEMA-001": {
    "files": [
      "evidence/EVD-CODEX-AUTOMATIONS-SCHEMA-001/report.json",
      "evidence/EVD-CODEX-AUTOMATIONS-SCHEMA-001/metrics.json",
      "evidence/EVD-CODEX-AUTOMATIONS-SCHEMA-001/stamp.json"
    ],
    "description": "Automation evidence schema baseline and example bundle."
  }
}
```

## Negative Fixture Examples

The following examples are invalid and must fail validation:

- **Timestamp outside `stamp.json`**

```json
{
  "run_id": "bad-run",
  "automation_id": "automation-a",
  "project_root": "/workspace/summit",
  "status": "ok",
  "pii_present": false,
  "findings": [],
  "diff_summary": {
    "files_changed": 0,
    "insertions": 0,
    "deletions": 0
  },
  "started_at": "2026-02-03T00:00:00Z"
}
```

- **Unknown status value**

```json
{
  "run_id": "bad-run",
  "automation_id": "automation-a",
  "project_root": "/workspace/summit",
  "status": "maybe",
  "pii_present": false,
  "findings": [],
  "diff_summary": {
    "files_changed": 0,
    "insertions": 0,
    "deletions": 0
  }
}
```

## Governance Notes

Evidence bundles are deterministic and replayable. Timestamps are constrained to
`stamp.json` to avoid nondeterministic report or metrics artifacts.
