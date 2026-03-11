# Cost Tracking Scripts

This directory contains scripts used to track, monitor, and report on the LLM token costs incurred by Summit. These tools provide visibility into spend by model and operation without modifying production code.

## Requirements

The scripts use dynamic instrumentation (via `unittest.mock.patch`) to intercept calls from various LLM providers (e.g. `OllamaProvider`) and log token usage along with cost calculations. This ensures that no production source code needs to be altered to generate insights.

## Features

- **Cost Aggregation:** Calculates spend broken down by model, operation type (entity extraction, embedding, answer generation, re-ranking), and daily trends.
- **Anomaly Detection:** Flags runaway token usage or excessively expensive individual queries based on configurable USD thresholds.
- **Reporting:** Exports detailed structured datasets to both JSON (`cost_report.json`) and CSV (`cost_report.csv`).
- **Simulation Mode:** Generates fake LLM traffic allowing you to test aggregation and reporting pipelines before production deployment.
- **Non-Invasive Instrumentation:** Monkeypatches known LLM provider functions at runtime to collect telemetry invisibly.

## Usage

### Run in Simulation Mode

Use this mode to generate fake traffic and observe the reports and anomalies:

```bash
python scripts/cost-tracking/track_costs.py --simulate
```

You can customize the anomaly threshold and output directory:

```bash
python scripts/cost-tracking/track_costs.py --simulate --anomaly-threshold 0.75 --output-dir /tmp/reports
```

### Run with Real Instrumentation

To run these scripts alongside your actual application without changing your codebase, you can use the `--instrument` flag. Because this requires the script to be loaded as part of your app's main process, you can import and initialize it in a wrapper script or entrypoint:

```python
from scripts.cost_tracking.track_costs import CostTracker, instrument_llm_calls

tracker = CostTracker(anomaly_threshold_usd=0.50)
instrument_llm_calls(tracker)

# Start your actual Summit app here...
# ...
# At exit, generate the report:
tracker.generate_report("./reports")
```

If you run the script standalone with `--instrument`, it will patch the modules but since no app code executes, the ledger will remain empty.

## Output

The script generates:
- `cost_report.json`: A full breakdown including trends, top N expensive queries, and summary stats.
- `cost_report.csv`: A flat ledger of every logged LLM call with associated metadata and cost.
