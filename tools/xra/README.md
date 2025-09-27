# Explainable Ranking Auditor (XRA)

XRA is a lightweight Python/TypeScript toolkit for auditing retrieval
systems. It replays recorded ranking logs, computes fairness and
coverage metrics, highlights potential exposure bias, and produces
model-agnostic explanations for rank shifts. The toolkit also ships with
an exportable Markdown report generator and a dashboard builder for
visual comparisons between retrieval versions.

## Features

- **Bias metrics** – exposure disparity, fairness@k, and coverage@k with
  deterministic seeds for reproducibility.
- **Rank shift explanations** – feature ablations and SHAP-lite scores
  derived from a linear surrogate model fitted on replayed logs.
- **Dashboard generation** – TypeScript utility that turns JSON audit
  payloads into shareable HTML dashboards.
- **Audit report** – Markdown export summarising metrics, alerts, and
  explanations suitable for compliance reviews.

## Python CLI

```
python -m xra.cli audit \
  tools/xra/examples/sample_retrieval_v1.json \
  tools/xra/examples/sample_retrieval_v2.json \
  --output tools/xra/runs/latest_summary.json \
  --report tools/xra/runs/latest_report.md \
  --dashboard-data tools/xra/runs/dashboard.json
```

The CLI writes a machine-readable JSON summary, a Markdown report, and a
dashboard payload that can be fed to the TypeScript dashboard builder.

## Dashboard builder

```
cd tools/xra/dashboard
npm install
npm run build -- --input ../runs/dashboard.json --output ../runs/dashboard.html
```

This produces a static HTML dashboard comparing baseline and candidate
systems with charts for fairness@k and coverage@k along with triggered
alerts and explanation snippets.

## Testing

```
cd tools/xra
pytest
```

The included test suite validates metric calculations and explanation
consistency on synthetic data sets with injected bias scenarios.
