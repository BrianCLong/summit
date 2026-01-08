# API Contract & Telemetry

## 1. API Contract

### Submit Experiment

**POST** `/api/v1/auto-scientist/experiments`

**Request:**

```json
{
  "topic": "string",
  "constraints": {
    "safety_level": "high",
    "budget": 100.0
  },
  "callback_url": "string"
}
```

**Response:**

```json
{
  "experiment_id": "uuid",
  "status": "queued",
  "eta_seconds": 300
}
```

### Get Results

**GET** `/api/v1/auto-scientist/experiments/{experiment_id}`

**Response:**

```json
{
  "experiment_id": "uuid",
  "status": "completed",
  "hypotheses": [
    {
      "id": "h-1",
      "text": "...",
      "safety_score": 0.98,
      "outcome": "validated"
    }
  ],
  "telemetry": {
    "iterations": 2,
    "tokens_used": 1500
  }
}
```

## 2. Telemetry Hooks

### Metrics

- `auto_scientist.hypotheses.generated_total`: Counter
- `auto_scientist.hypotheses.rejected_safety`: Counter
- `auto_scientist.loop.duration_seconds`: Histogram
- `auto_scientist.loop.iterations`: Histogram

### Tracing

- Span: `run_alignment_loop`
  - Attribute: `topic`
  - Event: `hypothesis_generated`
  - Event: `oversight_rejected`
  - Event: `refinement_complete`

## 3. Integration Points

- **Maestro**: Calls this API to trigger research sub-routines.
- **Summit UI**: Visualizes the "Oversight Loop" via the `experiment_id`.
