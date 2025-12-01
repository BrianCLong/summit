# Streaming Fairness Monitor (SFM)

The Streaming Fairness Monitor provides real-time fairness telemetry over streaming
prediction/outcome events. It exposes an HTTP API for ingesting events, inspecting live
metrics, retrieving alerts, minting signed fairness snapshots, and deterministically
replaying historical parquet captures.

## Features

- Rolling-window fairness metrics: TPR/FPR gaps, demographic parity differences, and
  equality of opportunity at top-k.
- Slice registry integration: loads deterministic slice definitions from the Data Slice
  Registry (DSR) export to enrich alerts with impacted cohorts.
- Threshold-driven alerting with accumulation across the active window.
- Deterministic, signed snapshots that reproduce byte-for-byte when invoked with the same
  seed.
- Parquet-backed replays for regression detection and audit.

## Running the service

```bash
cd streaming/sfm
go run ./cmd/sfm --addr :8085 \
  --window 10m --k 100 \
  --tpr-gap 0.08 --fpr-gap 0.06 --dp-diff 0.05 --eq-opp-diff 0.04 \
  --seed sfm-demo \
  --dsr ./testdata/slices.json
```

### API surface

| Endpoint     | Method | Description                                                                  |
| ------------ | ------ | ---------------------------------------------------------------------------- |
| `/events`    | POST   | Ingest a prediction/outcome event (JSON) and returns the refreshed snapshot. |
| `/metrics`   | GET    | Returns the latest fairness snapshot for the active rolling window.          |
| `/alerts`    | GET    | Lists active fairness alerts.                                                |
| `/snapshots` | POST   | Produces a signed snapshot (optionally override seed).                       |
| `/replay`    | POST   | Replays a parquet capture to reproduce metrics and alerts deterministically. |

Example ingest payload:

```json
{
  "prediction_id": "evt-001",
  "timestamp": "2025-09-01T12:00:00Z",
  "score": 0.91,
  "predicted_label": true,
  "actual_label": true,
  "group": "female",
  "attributes": { "gender": "female", "region": "emea" }
}
```

## Deterministic replays

Parquet files must contain the following schema:

- `prediction_id` (UTF8)
- `timestamp` (RFC3339 string)
- `score` (DOUBLE)
- `predicted_label` (BOOLEAN)
- `actual_label` (BOOLEAN)
- `group` (UTF8)
- `attributes` (UTF8 JSON map)

Replays are processed in timestamp order, with ties broken by prediction ID, ensuring
byte-for-byte identical results whenever the parquet and thresholds are unchanged.

## Development

Install dependencies and run the tests:

```bash
cd streaming/sfm
go test ./...
```

The repository ships with `testdata/slices.json` as a sample DSR export for local smoke
runs.
