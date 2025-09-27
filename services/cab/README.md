
# Contextual Access Broker (CAB)

CAB is a risk-adaptive authorization decision engine that combines ABAC policies with contextual risk scoring.

## Features

- Deterministic decisions when evaluated with the same attributes and signals.
- Pluggable risk scorers for geo, device posture, and anomaly telemetry.
- Step-up challenges (TOTP and hardware key stubs) enforced when risk exceeds the baseline threshold.
- Scenario simulator with replay support to guarantee policy stability over time.

## Running the Decision Service

```bash
cd services/cab
go run ./cmd/cab-server
```

The server listens on `:8085` by default. Override with `CAB_PORT`.

### Example Request

```bash
curl -s http://localhost:8085/evaluate       -H 'content-type: application/json'       -d '{
    "action": "workspace:update",
    "subject": {"role": "admin"},
    "resource": {"classification": "internal"},
    "signals": {"geo": "US", "devicePosture": "trusted", "anomalyScore": 0.2}
  }'
```

A `step-up` decision includes the challenges that must be satisfied. Provide challenge responses on subsequent requests:

```bash
curl -s http://localhost:8085/evaluate       -H 'content-type: application/json'       -d '{
    "action": "workspace:update",
    "subject": {"role": "admin"},
    "resource": {"classification": "internal"},
    "signals": {"geo": "US", "devicePosture": "trusted", "anomalyScore": 0.55},
    "challengeResponses": {
      "totp": {"code": "654321"},
      "hardware-key": {"assertion": "cab-hardware-assertion"}
    }
  }'
```

## Simulator UI

Open `ui/cab-simulator.html` in a browser and point it at the running service to experiment with policies and saved scenarios.

## Tests

```bash
cd services/cab
go test ./...
```
