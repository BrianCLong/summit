# Verifiable Synthetic Data Forge (VSDF)

VSDF is a constraint-first synthetic data workbench for tabular datasets. It
learns schema metadata, compiles fidelity and privacy constraints, generates
synthetic samples, and verifies the resulting datasets.

## Features

- **Schema learning** – infer column types, domains, and summary statistics.
- **Constraint compiler** – capture marginal distributions, pairwise
  correlations, and denial constraints from real data or explicit
  specifications.
- **Constraint-driven sampler** – generate tabular samples that respect the
  learned constraints while injecting configurable differential privacy noise.
- **Verifier** – compute fidelity scores, denial-constraint satisfaction, and a
  privacy-risk indicator to ensure synthetic data stays below a desired
  re-identification propensity ceiling.

## Getting started

Install the package in editable mode from the repository root:

```bash
pip install -e vsdf
```

Run the end-to-end notebook for a guided tour:

```bash
jupyter notebook vsdf/notebooks/vsdf_end_to_end.ipynb
```

For a privacy deep dive, open the companion notebook:

```bash
jupyter notebook vsdf/notebooks/vsdf_privacy_safeguards.ipynb
```

## Package layout

```
vsdf/
├── constraints.py   # Constraint types and compiler
├── sampler.py       # Constraint-driven sampler with DP noise
├── schema.py        # Schema learner utilities
├── verifier.py      # Fidelity + privacy verification
└── notebooks/       # Example notebooks
```

## License

VSDF is released under the MIT license.
