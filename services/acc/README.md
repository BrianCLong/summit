# Adaptive Consistency Controller (ACC)

ACC is a Go sidecar that plans per-request read/write consistency using policy tags
(`dataClass`, `purpose`, `jurisdiction`). It exposes an HTTP API and powers the TypeScript
SDK located at `sdk/acc`.

## Features

- Deterministic policy engine that maps tagged requests onto **strong**, **bounded staleness**,
  or **read-my-writes** modes.
- Replica planner that selects quorum memberships, replica routes, and staleness SLAs while
  emitting a detailed explain trace for every decision.
- Replayable fixtures (`services/acc/fixtures`) that validate the policy mappings, read-my-writes
  stickiness, and bounded-staleness fallbacks.
- Latency benchmarks via `go test -bench .` with documented reproducibility guidance under
  `services/acc/benchmarks`.

## Running the sidecar

```bash
cd services/acc
GO_CONFIG=./config/policies.yaml go run ./cmd/acc -config ./config/policies.yaml -addr :8088
```

### HTTP API

- `POST /plan` — Accepts a JSON body with policy tags and returns the mode, route, and explain trace.
- `POST /replica` — Updates observed replica latency and staleness metrics.
- `GET /healthz` — Readiness probe.

Example request:

```bash
curl -s http://localhost:8088/plan \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "demo",
    "operation": "read",
    "session": "sess-1",
    "dataClass": "behavioral",
    "purpose": "personalization",
    "jurisdiction": "us"
  }'
```

## Testing & Benchmarks

```bash
cd services/acc
GO_CONFIG=./config/policies.yaml go test ./...
go test -bench . -benchtime=2s -count=3 | tee benchmarks/latest.txt
```

Bench output and reproducibility notes live in `benchmarks/README.md`.

## Fixtures

Fixtures under `services/acc/fixtures` can be replayed via the `TestFixturesReplay` unit test.
Each fixture consists of a sequence of replica metric updates and plan expectations. They can also
be applied manually by `curl`ing the HTTP endpoints in the recorded order.
