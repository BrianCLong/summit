# Solid Gate Tool

Diff-scoped quality guardrail implementing the Summit SOLID/TDD engineering standard.

## Usage

```bash
python -m tools.solid_gate --diff-base origin/main
```

## Outputs

Artifacts are generated in `artifacts/solid-gate/`:
- `report.json`: List of findings.
- `metrics.json`: Summary counts.
- `stamp.json`: Execution metadata.

## Rules

- `TESTS_NOT_TOUCHED`: Source code modified but no tests changed.
- `PROTO_POLLUTION_RISK`: Usage of `in` operator for membership checks (JS/TS).
- `SMELL_LARGE_FILE`: File exceeds size threshold.
