# Summit Alerting Scripts

This directory contains the core logic for the operational monitoring alerts of the Summit pipeline.

## Structure

*   `rules/config.json`: The central configuration file holding alert rules. This file contains thresholds for error rates, latency spikes, ingestion backlogs, database connection failures, and memory limits. Each rule explicitly points to a documented runbook URL.
*   `engine.py`: The evaluation engine. It loads `config.json`, takes live metrics as input (simulated via Python dict in dry-run mode), evaluates rules, deduplicates repetitive alerts, logs alerts to `alert_history.log`, and routes notifications based on severity.
*   `formatters.py`: Payload formatting logic for external notification channels (Slack, PagerDuty, Email).

## Setup Instructions

1.  **Prerequisites**: The scripts rely on Python 3 and its standard library (`json`, `logging`, `operator`). No external dependencies like `pyyaml` are required since JSON is used.
2.  **Configuration**: Review and modify thresholds in `rules/config.json`. Ensure the `runbook_url` paths point to actual markdown files in `docs/runbooks/` matching the domain format (`https://runbooks.intelgraph.io/`).
3.  **Integrations**: Update dummy webhook URLs and routing keys in `formatters.py` with actual credentials for Slack and PagerDuty (this should ideally be passed via environment variables in production to prevent hardcoding secrets).
4.  **Logging**: Ensure the running environment has write access to the `scripts/alerting/` directory to create and append to `alert_history.log`.

## Usage

You can test the alerting evaluation engine locally with mock metrics by running:

```bash
python scripts/alerting/engine.py
```

This will run the mock metrics evaluation block defined at the bottom of `engine.py` and output results to standard output and `alert_history.log`.

To integrate this engine into a larger production pipeline, import the `evaluate_metrics` function and pass in real-time metrics data along with the path to the `config.json` file.
