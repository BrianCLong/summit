# Prompt Diff Impact Lab (PDIL)

PDIL is a hybrid Python/TypeScript toolkit for evaluating prompt revisions
against golden datasets. It provides deterministic replays with seed control,
risk-aware scoring, and a dashboard that ranks risky diffs by business impact.

## Features

- Deterministic golden set replays with pluggable model endpoint adapters.
- Failure taxonomy heuristics that tag regressions as omissions, schema
  mismatches, partial matches, or incorrect responses.
- Risk-weighted regression scoring that combines severity, business impact, and
  coverage delta penalties.
- TypeScript dashboard utilities for turning replay JSON into a sortable HTML
  report that highlights the riskiest diffs.

## Layout

```
sdk/pdil/
  adapters.py      # Model endpoint abstractions and reference adapters
  cli.py           # CLI entry point for running golden set replays
  models.py        # Dataclasses shared across the toolkit
  replay.py        # Deterministic replay engine
  risk.py          # Risk scoring implementation
  taxonomy.py      # Failure classification helpers
  README.md
  examples/
    golden_sample.json
  dashboard/
    package.json
    tsconfig.json
    src/
      index.ts
      dashboard.ts
      ranking.ts
      types.ts
    README.md
```

## Running replays

```
python -m sdk.pdil.cli sdk/pdil/examples/golden_sample.json v1 v2 \
  --seed 123 --adapter template --output pdil-report.json
```

The resulting JSON file can be rendered into an HTML dashboard via the
TypeScript utilities in `dashboard/`.
