# Governed Agent Integration Reference Architecture

## Readiness Assertion

This architecture is aligned to the Summit readiness baseline and inherits the current readiness guarantees described in `docs/SUMMIT_READINESS_ASSERTION.md` as the authority anchor for operational confidence and evidence posture.

## Non-negotiable invariants

1. **All calls enter via gateway** (OIDC/JWT + mTLS; centralized rate limits).
2. **Every run has** `run_id`, `trace_id`, `correlation_id`, `receipt_id`.
3. **OPA policy preflight** gates *both* plan selection and every privileged tool call.
4. **HITL** is mandatory for high-impact actions; agent defaults to *propose*, not *execute*.
5. **Hash-chained audit**: inputs → decisions → tool calls → outputs (append-only).

## Canonical APIs (OpenAPI-shaped)

### Front-door: Personal Agent API

**POST `/agent/run`** — run a workflow on a single object

Use when upstream provides the object already (alert JSON, ticket JSON).

```json
{
  "workflow": "alert_triage",
  "input": {
    "type": "Alert",
    "source": "splunk",
    "ref": "splunk:alert:8f3c…",
    "payload": { "...": "..." }
  },
  "tenant_id": "acme-prod",
  "mode": "assist",
  "budgets": { "max_seconds": 120, "max_tool_calls": 25, "max_cost_usd": 1.50 },
  "idempotency_key": "evt_8f3c…"
}
```

Response (async by default):

```json
{
  "run_id": "run_01HT…",
  "status": "queued",
  "links": {
    "status": "/runs/run_01HT…",
    "receipt": "/receipts/sha256:…"
  }
}
```

**POST `/agent/run-playbook`** — run a named, versioned SOP/runbook

Use when the control plane requires strict determinism.

```json
{
  "playbook_id": "soc.phishing_triage.v2",
  "params": { "alert_ref": "splunk:alert:8f3c…", "ticket_ref": "sn:INC00123" },
  "tenant_id": "acme-prod",
  "mode": "assist",
  "budgets": { "max_seconds": 300, "max_tool_calls": 60, "max_cost_usd": 4.00 },
  "idempotency_key": "sn:INC00123:soc.phishing_triage.v2"
}
```

**GET `/runs/{run_id}`** — status + output refs + approvals

```json
{
  "run_id": "run_01HT…",
  "status": "completed",
  "receipt_id": "sha256:…",
  "outputs": [
    { "type": "summary", "artifact_ref": "ledger://artifacts/sha256:…" },
    { "type": "recommendations", "artifact_ref": "ledger://artifacts/sha256:…" }
  ],
  "approvals": [
    {
      "approval_id": "apr_…",
      "required": true,
      "action_set_ref": "ledger://artifacts/sha256:…",
      "status": "pending",
      "submit_to": { "system": "servicenow", "record": "INC00123" }
    }
  ]
}
```

**POST `/agent/approve`** — approve a proposed action set

```json
{
  "approval_id": "apr_…",
  "approver": { "user_id": "u_123", "method": "oidc" },
  "decision": "approve",
  "comment": "Proceed with containment step 2 only."
}
```

## Canonical events + topics (Kafka default)

### Topic names (minimal)

- `alerts.created.v1`
- `tickets.created.v1`
- `agent.run.requested.v1`
- `agent.run.completed.v1`
- `agent.run.failed.v1`
- `agent.approval.requested.v1`
- `agent.approval.resolved.v1`
- `receipts.issued.v1`

### Envelope schema (all events)

```json
{
  "schema": "switchboard.event.v1",
  "event_type": "agent.run.requested",
  "event_id": "evt_…",
  "tenant_id": "acme-prod",
  "correlation_id": "corr_…",
  "trace_id": "trace_…",
  "occurred_at": "2026-02-07T…Z",
  "producer": "switchboard",
  "data": {}
}
```

### `agent.run.requested` payload

```json
{
  "run_id": "run_01HT…",
  "request": {
    "workflow": "alert_triage",
    "input_ref": "ledger://artifacts/sha256:…",
    "mode": "assist",
    "budgets": { "max_seconds": 120, "max_tool_calls": 25, "max_cost_usd": 1.50 }
  }
}
```

**Idempotency rule:** `event_id` + `tenant_id` is unique; consumers must be idempotent.

## Switchboard connector contracts (Splunk + ServiceNow + Slack)

### Inbound: Splunk webhook

**POST `/webhooks/splunk`**

- Validates signature/IP allowlist
- Normalizes to internal `Alert.v1`
- Writes:
  - `alerts.created.v1`
  - `agent.run.requested.v1` (policy-dependent)

Normalization output stored as artifact:

- `ledger://artifacts/{sha256}` with `type=alert.v1`

### Outbound: ServiceNow update

**POST** (connector internal): `servicenow.comment.add`

- Inputs: `ticket_ref`, `comment_md`, `attachments[]`, `receipt_link`
- Must include `receipt_id` linkback for audit/replay

### Outbound: Slack notification

`slack.postMessage` to `#soc-triage`

- “Agent triaged Alert X → summary + recommended actions → approval link”
- Include `run_id` + `receipt_id`

## Maestro orchestration contract (internal)

Maestro consumes `agent.run.requested.v1` and produces:

- `agent.run.completed.v1` (with `receipt_id`)
- `agent.run.failed.v1`

### Internal calls Maestro may make (reference stack)

- IntelGraph:
  - `POST /intel/enrich`
  - `POST /intel/find-similar-cases`
- CompanyOS:
  - `POST /runbook/plan`
  - `POST /runbook/execute` (safe steps only)
  - `POST /kb/query`
- LLM proxy:
  - `POST /llm/completions` (policy-controlled model routing)

### Tool-call gating (OPA at every step)

Every privileged call is preceded by:

`POST /policy/eval`

```json
{
  "tenant_id": "acme-prod",
  "principal": { "service": "maestro", "run_id": "run_…" },
  "action": "servicenow.comment.add",
  "resource": "sn:INC00123",
  "context": {
    "mode": "assist",
    "severity": "high",
    "workflow": "alert_triage",
    "budgets": { "remaining_cost_usd": 1.10 }
  }
}
```

Decision:

```json
{
  "allow": true,
  "reason": "Assist mode allows comment.add; no state-changing containment requested.",
  "rule_id": "SNOW.COMMENT.ALLOW"
}
```

This establishes a policy-blocked surface for prompt injection and tool/plugin poisoning by design.

## Audit writer + receipt minimum fields

### Hash-chained audit record (append-only)

For each run, append records in order:

1. `RunStarted` (input artifact hashes)
2. `PolicyDecision` (rule_id, allow/deny, inputs_hash)
3. `ToolCall` (tool, inputs_hash, outputs_hash, timing)
4. `ArtifactCreated` (artifact_id, type, hash, sensitivity)
5. `ApprovalRequested` (action_set_hash)
6. `RunCompleted` (receipt_id)

### Receipt must carry (minimum)

- `receipt_id` (content hash)
- `run_id`, `trace_id`, `tenant_id`
- `workflow/playbook_id@version`
- `policy_version` + `policy_decisions[]`
- `tool_calls[]` (hashed I/O)
- `artifacts[]` (hashes + refs)
- `approvals[]` (if any)
- `signature` (runtime signing key)

## Concrete “SIEM → Agent → SOAR/ITSM” flow

1. Splunk → `POST /webhooks/splunk`
2. Switchboard:
   - stores normalized `Alert.v1` artifact
   - emits `alerts.created.v1`
   - emits `agent.run.requested.v1` (workflow=`alert_triage`)
3. Maestro:
   - `policy/eval` (triage allowed)
   - fetches needed detail via Splunk connector (read-only)
   - calls IntelGraph enrich + similar cases
   - calls CompanyOS `runbook/plan` for suggested actions
   - assembles outputs + proposed actions (tag high-impact as HITL-required)
   - writes receipt + emits `agent.run.completed.v1`
4. Switchboard outbound:
   - posts summary + enrichment into ServiceNow work notes
   - posts Slack notification with approval link if containment proposed
   - emits `receipts.issued.v1`

## Swap matrix (infra alternatives)

### AWS SNS/SQS instead of Kafka

- Replace topics with:
  - SNS topic: `agent-events`
  - Message attribute: `event_type`
  - SQS subscriptions by event_type filter policy
- Keep the same envelope and idempotency rules.

### Sentinel instead of Splunk

- Same connector contract; only normalization mapping changes:
  - Sentinel alert schema → internal `Alert.v1`

### Jira instead of ServiceNow

- Replace `servicenow.comment.add` with `jira.issue.comment.add` and optional field updates.

## Minimum delivery slices

- **Slice A (2 weeks):** Splunk webhook + `alert_triage` workflow + ServiceNow comment + receipts
- **Slice B (week 3):** Approval loop (propose/approve) + Slack notify
- **Slice C (week 4):** 2nd workflow (`phishing_triage.v2`) + basic runbook planning via CompanyOS

## MAESTRO security alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** prompt injection, tool/plugin poisoning, credential misuse, policy bypass, audit tampering
- **Mitigations:** gateway ingress controls, OPA preflight per action, HITL for high-impact steps, hash-chained receipts, and append-only audit ledger with signature verification
