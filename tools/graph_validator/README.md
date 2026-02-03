# Graph Validator (Scaffold)

This tool provides the initial scaffold for the Graph↔Postgres Drift Validator. It focuses on
configuration loading, evidence ID generation, and report emission to establish deterministic,
repeatable outputs.

## Quickstart

```bash
python -m pip install -r tools/graph_validator/requirements.txt
python tools/graph_validator/run.py \
  --mapping tools/graph_validator/fixtures/mapping.example.yml \
  --mode ci
```

Outputs are written to `tools/graph_validator/reports/<evidence_id>/` and mirrored to
`tools/graph_validator/reports/latest/` for CI consumption.

## CLI

- `--mapping`: path to `mapping.yml`
- `--out`: output directory (default: `tools/graph_validator/reports`)
- `--mode`: `ci`, `nightly`, or `audit`
- `--seed`: deterministic seed override
- `--tenant`: optional tenant namespace
- `--code-sha`: override Git SHA (defaults to `GITHUB_SHA`)
