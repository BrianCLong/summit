# Explainable Sampling Auditor (ESA)

ESA is a Python toolkit and CLI for evaluating sampling plans used in analytics jobs. It supports multiple sampling strategies, computes explainability artifacts, and produces auditable Markdown reports that can be enforced in CI pipelines.

## Features

- **Sampling plans**: uniform, stratified, probability proportional to size (PPS), and reservoir sampling.
- **Explainability**: sampling proofs containing seed, RNG state hash, inclusion probabilities, and sampled rows.
- **Diagnostics**: bias and variance checks against analytical expectations for common estimators.
- **What-if simulator**: explore alternative sample sizes or stratification choices before executing a job.
- **Markdown audit reports**: generate ready-to-commit evidence for compliance reviews.
- **CI gate**: fail builds when sampling error exceeds configured tolerances.

## Getting Started

```bash
cd tools/esa
python -m esa.cli evaluate --plan examples/uniform_plan.json --dataset examples/orders.csv
```

See `esa/cli.py` for additional commands.
