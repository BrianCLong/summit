# Responsible Evaluation Orchestrator (REO)

REO is a governance-first evaluation framework that runs offline safety, privacy, bias,
and robustness test suites against multiple model versions. Suites are defined in YAML,
scored with weighted rollups, and executed reproducibly via stratified sampling. Results can
be exported as JSON or JUnit XML and compared across model versions for regression analysis.

## Key Features

- **Unified configuration** – describe suites, tasks, datasets, and metrics in YAML.
- **Stratified sampling** – deterministic sampling with configurable seeds to ensure
  reproducible subsets.
- **Weighted scoring** – suite and dimension rollups respond immediately to config changes.
- **Model comparisons** – compute regressions, deltas, and confidence intervals between
  baseline and candidate runs.
- **Artifacts** – export machine-consumable JSON and JUnit XML for CI integration.

## Quick Start

```bash
pip install -e .
reo run path/to/suite.yaml --model ./models/candidate.py --baseline ./runs/baseline.json
```

See `reo/tests/sample_suite.yaml` for an end-to-end example configuration.
