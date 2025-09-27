# Purpose Drift Auditor (PDA)

The Purpose Drift Auditor monitors production traffic to ensure declared purpose-of-use tags remain aligned with the consent and contract registry. It continuously evaluates events, emits drift alerts with routed ownership, and provides full explainability for every verdict.

## Features

- Streaming consent updates via newline-delimited JSON rule feeds.
- Suppression windows per endpoint tag to avoid alert storms.
- Ownership routing with fallbacks for orphaned signals.
- Deterministic replay runner for seeded validation.
- Explainability traces (`policy → event → verdict`) available through the API.

## Running

```bash
cd services/pda
PDA_HTTP_PORT=8086 go run ./cmd/pda
```

## HTTP Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/v1/health` | Service heartbeat, current false positive rate. |
| `POST` | `/api/v1/events` | Evaluate an event against the consent registry. |
| `GET` | `/api/v1/alerts` | Retrieve recent drift alerts. |
| `GET` | `/api/v1/explain?eventId=` | Fetch the recorded explainability trace. |
| `GET`/`POST` | `/api/v1/contracts` | Inspect or replace the consent registry snapshot. |
| `POST` | `/api/v1/rules/stream` | Push NDJSON rule updates (streaming). |

## Testing

```bash
cd services/pda
go test ./...
```

Replay fixtures live in `testdata/` and are used to guarantee deterministic alerts on seeded event streams.

