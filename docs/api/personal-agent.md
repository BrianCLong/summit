# Personal Agent API Spec v0.1

The Personal Agent API is the primary front-door for enterprise users and systems to invoke governed agentic workflows. All requests must follow the canonical message envelope.

## Canonical Message Envelope

Every request to the Agent API must be wrapped in the following envelope:

```json
{
  "meta": {
    "schema": "https://summit.dev/schemas/envelope.v0.1.json",
    "tenant_id": "t_123",
    "correlation_id": "c_abc",
    "idempotency_key": "ik_456",
    "source": "switchboard",
    "ts": "2026-02-07T19:05:00Z"
  },
  "payload": { ... }
}
```

## Endpoints

### `POST /agent/run`
Runs a workflow on a single input object (e.g., an alert JSON).

**Payload (nested in envelope):**
```json
{
  "type": "alert_triage",
  "input_ref": { "kind": "alert", "id": "alert_456" },
  "constraints": {
    "mode": "assist",
    "max_wall_ms": 60000
  }
}
```

### `POST /agent/run-playbook`
Runs a named playbook (e.g., `phishing_triage_v2`) with parameters.

**Payload (nested in envelope):**
```json
{
  "playbook": "phishing_triage_v2",
  "params": {
    "alert_id": "alert_456",
    "source": "splunk"
  }
}
```

### `GET /runs/{run_id}`
Fetch status, outputs, and audit trail.

**Response:**
```json
{
  "run_id": "run_001",
  "status": "completed",
  "outputs": {
    "summary_md": "...",
    "recommended_actions": [...]
  },
  "governance": {
    "policy_version": "...",
    "audit_record_ids": [...],
    "evidence_bundle_ref": "..."
  }
}
```

## Governance Invariants

1. Every run must include a `tenant_id` and `correlation_id` in the `meta` block.
2. All outputs must link to an immutable evidence bundle.
3. High-impact actions require human-in-the-loop (HITL) approval.
