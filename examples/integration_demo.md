# Agent Gateway Integration Demo

This walkthrough shows how to send a governed request through the Agent Gateway, validate it against the request schema, enforce auth/policy hooks, and observe the propagated correlation ID from ingress through egress.

## Prerequisites

- Agent Gateway running locally on port `3001`.
- An agent API token (`AGENT_API_TOKEN`).
- A tenant ID the agent is allowed to access (for example `tenant-123`).

## Request/Response Contract

**Request schema highlights**

- `tenantId` (**required**): tenant scope for the call.
- `operationMode` (optional): `SIMULATION` | `DRY_RUN` | `ENFORCED`.
- `action` (**required**): `{ type, target?, payload? }`.
- `correlationId` (optional): supplied via header or body; generated automatically when omitted.

**Response envelope**

- `success`: boolean outcome.
- `runId`: gateway-executed run identifier.
- `operationMode`: effective mode after validation.
- `correlationId`: echoed from ingress for traceability.
- `action`: `{ id, type, authorizationStatus, executed }`.
- Optional `approval` and `error` blocks for pending/failed flows.

## End-to-End Demo

1. **Send a request with a correlation ID**

```bash
CORRELATION_ID="demo-corr-$(date +%s)"

curl -X POST http://localhost:3001/api/agent/execute \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: $CORRELATION_ID" \
  -d '{
    "tenantId": "tenant-123",
    "operationMode": "SIMULATION",
    "action": {
      "type": "read",
      "target": "entities",
      "payload": { "filter": "status=active" }
    }
  }'
```

2. **Observe pipeline stages**

- **Ingress**: middleware records the correlation ID and attaches it to the request context.
- **Auth hook**: authenticated agent info is logged and shared with downstream policy evaluation.
- **Policy hook**: policy decisions are logged with the same correlation ID for lineage.
- **Egress**: the response body and `x-correlation-id` header echo the identifier.

3. **Inspect the response**

A successful response will look similar to:

```json
{
  "success": true,
  "runId": "agent-run-123",
  "operationMode": "SIMULATION",
  "correlationId": "demo-corr-1730000000",
  "action": {
    "id": "act-123",
    "type": "read",
    "authorizationStatus": "allowed",
    "executed": false
  },
  "result": {
    "message": "Would execute read on entities",
    "wouldPerform": {
      "type": "read",
      "target": "entities",
      "payload": { "filter": "status=active" }
    },
    "estimatedImpact": []
  }
}
```

If the schema validation fails, the gateway returns HTTP 400 with a `details` array showing the violated paths (e.g., missing `tenantId` or `action.type`).

## Tracing Tips

- Every request automatically receives an `x-correlation-id` response header for downstream services.
- Policy and auth events are emitted with the same correlation ID, simplifying multi-service log searches.
- The gateway response embeds the correlation ID so that clients can stitch together ingress, pipeline, and egress records in observability tools.
