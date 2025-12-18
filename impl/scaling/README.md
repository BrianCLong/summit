# Scaling & AutoML Service Skeleton

This directory captures the schema foundation and a reference implementation for
the Scaling & AutoML Orchestrator v0.1. It now includes Python utilities to
ingest telemetry, fit lightweight scaling laws and response surfaces, and plan
follow-on experiments.

## Schemas
- `config.schema.json`: Model/data/training/runtime knobs used to generate experiments and recommendations.
- `metrics.schema.json`: Training, evaluation, runtime, and uncertainty metrics captured for each experiment.
- `experiment.schema.json`: Full experiment record combining config, metrics, hardware/environment metadata, and artifacts.
- `recommendation.schema.json`: Planner output describing the recommended config, predicted metrics, constraints, and follow-on experiments.

## Python Toolkit
- `core.py`: Dataclasses mirroring schema payloads.
- `validation.py`: Minimal schema-driven validator for JSONL ingestion.
- `ingest.py`: JSONL loader that validates records and constructs domain objects.
- `modeling.py`: Simple power-law fits and linear response-surface regression.
- `planner.py`: AutoML-style planner that scores candidate configs under constraints.
- `cli.py`: Runs end-to-end ingest → fit → recommend against a JSONL file.

### Quickstart
```bash
python -m impl.scaling.cli \
  --experiments impl/scaling/sample_runs.jsonl \
  --schema impl/scaling/schemas/experiment.schema.json \
  --objective reasoning_score \
  --max-context 16384
```

### Tests
Run the focused test suite:
```bash
python -m pytest tests/impl/scaling
```

## Roadmap Hooks
- Extend `config.schema.json` with hardware-aware settings (e.g., compiler flags, quantization recipes) as the planner integrates with deployment tooling.
- Add lineage fields (data provenance, feature attributions) and a schema for `scaling_law_fit` artifacts as models mature.
- Swap the linear response model for Bayesian optimization or tree-based regressors when larger telemetry volumes are available.
