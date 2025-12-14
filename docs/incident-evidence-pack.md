# Incident Evidence Pack Generator

The `tools/incident_evidence_pack.py` script builds a timestamped evidence pack whenever an incident trigger is raised. It captures key operational artifacts, normalizes them into a structured JSON manifest, and produces a human-friendly HTML bundle for rapid review.

## What it captures

- **Logs**: `.log` and `.out` files from provided directories.
- **Traces**: Trace exports such as OTLP/JSON files.
- **Configs**: JSON/YAML configuration snapshots for change correlation.
- **Metrics deltas**: Compares a current metrics snapshot with an optional baseline to surface drifts.
- **Deploy metadata**: Reads a provided metadata file or falls back to Git commit/branch/tag info.

## Usage

```bash
python tools/incident_evidence_pack.py \
  --incident-id INC-1234 \
  --severity critical \
  --logs logs services/api/logs \
  --traces ops/otel \
  --configs server/config \
  --metrics metrics/current.json \
  --metrics-baseline metrics/baseline.json \
  --deploy-metadata deploy/metadata.json \
  --notes "PagerDuty auto-trigger"
```

Outputs are written to `artifacts/evidence-packs/incident-<id>-<timestamp>/` and include:

- `evidence-pack.json`: machine-readable manifest of all captured artifacts.
- `evidence-pack.html`: HTML summary with tables for artifacts, metrics, and deployment info.
- `attachments/`: copied artifacts grouped by category for long-term retention.

## Operational tips

- Provide a baseline metrics file to automatically compute drift deltas during an incident.
- To integrate with automation, call the script from your alerting pipeline and pass the incident identifier and trigger notes.
- The script is idempotent per invocation and will not overwrite prior packs because it scopes outputs by timestamp.
