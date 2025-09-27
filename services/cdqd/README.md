# Continuous Data Quality Detective (CDQD)

CDQD is a Go microservice that learns seasonality-aware baselines for streaming metrics while enforcing declarative data quality rules for tabular datasets.

## Features

- Triple exponential smoothing (Holt-Winters) with residual MAD thresholds.
- Robust z-score detector for distributional shifts.
- Denial constraints and entity integrity enforcement with auto-explanations.
- Alert suppressions to prevent flapping.
- Backfill endpoint for historical ingestion.
- Deterministic replays to verify alert reproducibility.

## Running

```bash
cd services/cdqd
go run ./cmd/cdqd
```

By default the service listens on `:8080`. Use the `-addr` flag to override.

## Key Endpoints

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/metrics/ingest` | Stream metric datapoints. |
| `POST /api/v1/backfill` | Historical ingestion using the same detectors. |
| `POST /api/v1/rules` | Register denial constraint / entity integrity rules. |
| `POST /api/v1/datasets/{name}/rows` | Ingest dataset rows for rule evaluation. |
| `POST /api/v1/suppressions` | Register alert suppressions. |
| `GET /api/v1/anomalies` | List emitted anomalies with explanations. |
| `POST /api/v1/replay` | Reprocess the event log and validate deterministic alerts. |

All responses are JSON encoded. See the UI project in `ui/cdqd` for a reference client.

