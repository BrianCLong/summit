# Risk-Adaptive Rate Limiter (RARL)

RARL is a Go sidecar that enforces per-tenant, per-tool quotas while dynamically adjusting
limits based on risk signals. It exposes a deterministic HTTP API for quota decisions and
signed limit snapshots, and ships with a TypeScript SDK under `sdk/rarl`.

## Running the sidecar

```bash
# from repo root
cd tools/rarl
# adjust the sample config or provide your own
CONFIG=config/sample-config.json

go run ./cmd/rarl -config $CONFIG -addr :8080
```

### `/decision`

`POST /decision` evaluates a quota request.

```json
{
  "tenantId": "tenant-a",
  "toolId": "embedding-api",
  "units": 3,
  "geo": "us",
  "policyTier": "gold",
  "anomalyScore": 0.15,
  "priorityLane": "priority",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Responses are deterministic for identical inputs and include the remaining capacity for the
active window.

### `/snapshot/{tenantId}`

Returns a signed snapshot containing tool and lane usage counters. Snapshots can be verified
offline via the SDK or the `VerifySnapshot` helper in Go.

## Testing

```bash
cd tools/rarl
go test ./...
```
