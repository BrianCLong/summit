# Graph Shape Guardrail

A lightweight tool to catch silent graph-mapping regressions by monitoring the degree distribution shape. It tracks **Skewness** and **Top-1% Mass** to detect structural shifts like "super-hubs" or missing edges.

## Features

- **Reservoir Sampling**: Samples N=50k degrees per label efficiently using Algorithm R.
- **Cheap Metrics**: Computes normalized skewness and top-1% mass share.
- **Baseline Comparison**: Compares current window against a 14-day rolling baseline.
- **Alerting**: Fails with exit code 1 if:
  - `|Δskew| > 0.5`
  - `Δ(top1%_mass) > 5.0` (percentage points)
- **Zero-Dependency (mostly)**: Uses `neo4j` driver, `numpy`, and `scipy`.

## Installation

```bash
pip install -r tools/graph-shape-guardrail/requirements.txt
```

## Usage

### CLI

```bash
python tools/graph-shape-guardrail/guardrail.py \
  --label Person \
  --uri bolt://localhost:7687 \
  --username neo4j \
  --password secret
```

Arguments:
- `--label`: The Neo4j node label to check (Required).
- `--reservoir-size`: Size of reservoir sample (Default: 50000).
- `--metrics-file`: Path to JSON file storing metrics history (Default: `metrics.json` in tool dir).
- `--uri`, `--username`, `--password`: Neo4j connection details (can also use env vars `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`).

### GitHub Action

Use the included composite action in your workflows:

```yaml
name: Graph Shape Check
on:
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  check-shape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check Person Label
        uses: ./tools/graph-shape-guardrail
        with:
          label: 'Person'
          neo4j-uri: ${{ secrets.NEO4J_URI }}
          neo4j-username: ${{ secrets.NEO4J_USERNAME }}
          neo4j-password: ${{ secrets.NEO4J_PASSWORD }}
```

## Metrics Explanation

- **Skewness**: Measures asymmetry. A jump indicates a shift in connectivity pattern (e.g., many nodes suddenly gaining few edges or losing them).
- **Top-1% Mass**: Measures hub concentration. If the top 1% of nodes account for a significantly larger share of total edges, it suggests a "super-hub" issue or fan-out regression.

## Output

The tool logs metrics to stdout and updates `metrics.json`. If a threshold is breached, it logs an error and exits with code 1, which fails the CI job.
