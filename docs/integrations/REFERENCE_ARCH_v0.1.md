# Reference Architecture Spec v0.1 — Governed Personal Agent Integration

**Summit readiness anchor:** This spec is aligned to the Summit Readiness Assertion and must remain
consistent with the canonical governance sources of truth. See
`docs/SUMMIT_READINESS_ASSERTION.md` for baseline readiness assertions.

## 0) Non‑negotiable invariants

1. Every run includes: `run_id`, `tenant_id`, `correlation_id`, `policy_version`, and
   `receipt_hash` (or an audit chain pointer).
2. No side‑effecting action executes without **policy allow** and (when required) **HITL approval**
   stamped into the audit record.
3. All outbound outputs carry `policy_decisions[]`, `audit_record_ids[]`, and
   `evidence_bundle_ref`.

## 1) High‑level data flow (governed, event‑driven)

1. Upstream systems emit event/API (SIEM alert, ticket, OSINT update).
2. **Switchboard** ingests, normalizes, tags, and publishes to the event bus.
3. **Maestro** consumes `agent.run.requested`, evaluates OPA/Rego policies, and orchestrates tool
   calls.
4. **Personal Agent** composes outputs (summary, enrichment, recommended actions).
5. **Switchboard** routes results back to SIEM/SOAR/ticketing/ChatOps with audit + policy metadata.

## 2) Runtime topology (services + control plane)

- **switchboard-api**: inbound webhooks, outbound connectors
- **personal-agent-api**: `/agent/*` front door
- **maestro-orchestrator**: workflow engine + policy checks
- **llm-proxy**: model routing + budget enforcement
- **intelgraph-api**: enrichment + case graph
- **companyos-api**: runbooks + KB
- **opa**: policy evaluation
- **audit-writer**: hash‑chained audit ledger + receipts
- **event-bus**: Kafka/SNS/SQS abstraction

## 3) Canonical message envelope (shared contract)

All bus events and API requests embed the same envelope:

```json
{
  "meta": {
    "schema": "summit.envelope.v0.1",
    "tenant_id": "t_123",
    "correlation_id": "c_abc",
    "idempotency_key": "ik_...",
    "source": "switchboard",
    "ts": "2026-02-07T19:05:00Z"
  },
  "payload": {}
}
```

## 4) Personal Agent API (front door)

### 4.1 Endpoints

- `POST /agent/run`
- `POST /agent/run-playbook`
- `GET /runs/{run_id}`

### 4.2 Request/response shapes

**POST `/agent/run`**

```json
{
  "meta": { "...envelope.meta..." },
  "payload": {
    "type": "alert_triage",
    "input_ref": { "kind": "alert", "id": "alert_456" },
    "input": { "optional_inline": "alert json if small" },
    "constraints": {
      "mode": "assist",
      "max_wall_ms": 60000,
      "max_cost_usd": 2.0,
      "tools_allowlist": [
        "intelgraph.enrich",
        "companyos.kb.query",
        "connector.splunk.fetch"
      ]
    }
  }
}
```

Response:

```json
{
  "run_id": "run_001",
  "status": "queued",
  "meta": { "tenant_id": "t_123", "correlation_id": "c_abc" }
}
```

**GET `/runs/{run_id}`**

```json
{
  "run_id": "run_001",
  "status": "completed",
  "outputs": {
    "summary_md": "…",
    "enrichment": { "iocs": [], "similar_cases": [] },
    "recommended_actions": [
      { "action": "soar.containment.isolate_host", "requires_approval": true }
    ]
  },
  "governance": {
    "policy_version": "policyset_sha256:…",
    "policy_decisions": [{ "rule_id": "OPA.RUN.ALLOW", "outcome": "allow" }],
    "audit_record_ids": ["aud_1001", "aud_1002"],
    "evidence_bundle_ref": "ledger://evidence/run_001"
  }
}
```

## 5) Switchboard interfaces

### 5.1 Inbound webhook endpoints

- `/webhooks/splunk`
- `/webhooks/sentinel`
- `/webhooks/servicenow`
- `/webhooks/jira`

**Webhook contract**

1. Verify vendor signature.
2. Normalize payload to canonical `Alert`/`Ticket`.
3. Emit `alerts.created` or `tickets.created` with correlation IDs.
4. Optionally call `POST /agent/run(-playbook)`.

### 5.2 Bus topics

- `alerts.created`
- `tickets.created`
- `agent.run.requested`
- `agent.run.completed`
- `agent.run.failed`
- `audit.record.appended` (optional)

## 6) Maestro orchestration contract

### 6.1 Consumes

- `agent.run.requested`

### 6.2 Produces

- `agent.run.completed` / `agent.run.failed`

### 6.3 Deterministic step model

```json
{
  "run_id": "run_001",
  "steps": [
    { "id": "s1", "tool": "connector.splunk.fetch", "status": "ok" },
    { "id": "s2", "tool": "intelgraph.enrich", "status": "ok" },
    { "id": "s3", "tool": "companyos.runbook.plan", "status": "ok" }
  ]
}
```

### 6.4 OPA policy input shape

```json
{
  "tenant_id": "t_123",
  "principal": { "user_id": "u_9", "role": "analyst" },
  "run": { "type": "alert_triage", "severity": "high", "mode": "assist" },
  "action": { "tool": "soar.containment.isolate_host", "kind": "side_effect" },
  "resource": { "system": "splunk", "object_id": "alert_456" },
  "context": { "budget_usd": 3.0, "data_residency": "us-west" }
}
```

## 7) IntelGraph + CompanyOS contracts (minimum viable)

### 7.1 IntelGraph

- `POST /intel/enrich`
- `POST /intel/find-similar-cases`
- `GET /intel/case/{id}`

### 7.2 CompanyOS

- `POST /runbook/plan`
- `POST /runbook/execute`
- `POST /kb/query`

## 8) Audit writer + evidence bundle (hash‑chained)

### 8.1 Audit record

```json
{
  "schema": "summit.audit.record.v0.1",
  "audit_id": "aud_1002",
  "tenant_id": "t_123",
  "correlation_id": "c_abc",
  "run_id": "run_001",
  "event": "tool.call",
  "tool": "intelgraph.enrich",
  "inputs_hash": "sha256:…",
  "outputs_hash": "sha256:…",
  "policy": { "decision_id": "dec_77", "outcome": "allow", "rule_id": "OPA.TOOL.ALLOW" },
  "prev_hash": "sha256:…",
  "hash": "sha256:…",
  "ts": "2026-02-07T19:05:14Z"
}
```

### 8.2 Evidence bundle reference

`ledger://evidence/run_001` resolves to:

- run summary
- deterministic step list
- tool calls (redacted)
- policy decisions
- artifacts index

## 9) Sequence: Splunk alert → agent triage → SOAR + Slack

1. Splunk `POST /webhooks/splunk` → Switchboard
2. Switchboard normalizes → emits `alerts.created`
3. Switchboard calls `POST /agent/run-playbook` (`phishing_triage_v2`)
4. Personal Agent API publishes `agent.run.requested`
5. Maestro:
   - OPA allow triage
   - fetch alert details
   - IntelGraph enrich + similar
   - CompanyOS plan actions
   - audit + evidence bundle
6. Maestro emits `agent.run.completed`
7. Switchboard outbound:
   - SOAR worknotes update
   - Slack approval message
   - includes evidence bundle + policy decisions

## 10) Minimal repo layout (engineer handoff)

```
services/
  switchboard-api/
    routes/webhooks/
    connectors/inbound/
    connectors/outbound/
    normalizers/
  personal-agent-api/
    routes/agent.ts
    routes/runs.ts
    publisher/bus.ts
  maestro-orchestrator/
    consumers/agent_run_requested.ts
    workflows/
    policy/
  audit-writer/
    append.ts
    chain.ts
packages/
  schemas/
    envelope.v0.1.json
    alert.v0.1.json
    ticket.v0.1.json
    run.v0.1.json
    audit.record.v0.1.json
  opa/
    policies/
    tests/
  sdk/
    bus/
    clients/intelgraph.ts
    clients/companyos.ts
    clients/llmproxy.ts
```

## 11) Thin‑slice implementation (two weeks)

**Slice A: Alert triage**

- Switchboard: `/webhooks/splunk` + Alert normalization
- Bus: `alerts.created`, `agent.run.*`
- Maestro: `phishing_triage_v2` workflow (fetch details + IntelGraph + CompanyOS)
- Output: SOAR worknote + Slack approval
- Governance: OPA checks on tool usage + side effects
- Audit: hash‑chained tool‑call + policy‑decision records

**Slice B: Ticket summarization**

- Switchboard: `/webhooks/servicenow` normalize `Ticket`
- Maestro: `incident_summarize_and_route`
- Switchboard: update ticket fields + internal comment with evidence

## 12) MAESTRO security alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

**Threats Considered:**
- Webhook spoofing
- Connector token theft
- Policy bypass attempts
- Cross‑tenant data leakage
- Prompt injection via event fields
- Audit log tampering

**Mitigations:**
- mTLS + signed webhooks + tenant scoping
- Workload identity + scoped tokens (no user keys)
- OPA deny‑by‑default + HITL obligations
- Tenant‑partitioned storage + bus partitions
- Strict input validation + schema enforcement
- Hash‑chained audit + immutable evidence bundles

## 13) Forward‑leaning enhancement (state‑of‑the‑art)

**Policy‑aware run‑spec compiler:** preflight playbooks into a signed, immutable run‑spec that
pinpoints required capabilities and blocks deployment unless policy analysis passes. This compresses
feedback loops and prevents runtime policy bypasses.

## 14) Governance status

Any exception to the invariants above is a **Governed Exception** and must be recorded in the
policy ledger with a rollback trigger. Deferred pending governance sign‑off.
