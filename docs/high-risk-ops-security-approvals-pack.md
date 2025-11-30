# High-Risk Ops & Security Approvals Pack

## 1. Capability Overview
**Goal:** Ensure every high-risk operation (prod data access, permission changes, key rotation, destructive actions) is discoverable in the graph, gated by policy, executed through orchestrated workflows, and automatically emits receipts and evidence bundles surfaced in Switchboard.

### 1.1 Core user stories
- **Engineer:** Request a risky action (e.g., temporary prod DB read), see required approvals and policy evaluation, and receive an auditable record after execution.
- **Security/Infra owner:** Define which actions are high-risk, set policies (who can request/approve, conditions, expiry), and review/audit all high-risk operations centrally.
- **CISO/Compliance auditor:** Export an audit-ready bundle across a time range with evidence that policy and dual control were enforced.

## 2. Domain Model & Graph

### 2.1 Key entities
- `User`, `Team`, `Tenant`, `Environment`
- `System` (e.g., Postgres cluster, S3 bucket, IAM, internal app)
- `HighRiskOperationType` (e.g., `DB_READ_ACCESS`, `ROLE_ELEVATION`, `BULK_DELETE`)
- `HighRiskOperationRequest`
- `Approval`
- `PolicyDecision`
- `Receipt`
- `EvidenceBundle`

### 2.2 Relationships (high level)
- `User` —(MEMBER_OF)→ `Team`
- `User` —(HAS_ROLE)→ `Role` (attributes used in ABAC)
- `HighRiskOperationRequest` —(REQUESTED_BY)→ `User`
- `HighRiskOperationRequest` —(TARGETS)→ `System`
- `HighRiskOperationRequest` —(HAS_TYPE)→ `HighRiskOperationType`
- `HighRiskOperationRequest` —(HAS_APPROVAL)→ `Approval` (many)
- `HighRiskOperationRequest` —(HAS_POLICY_DECISION)→ `PolicyDecision`
- `HighRiskOperationRequest` —(EMITTED_RECEIPT)→ `Receipt`
- `Receipt` —(AGGREGATES)→ `EvidenceBundle`

## 3. End-to-end Workflow (happy path)

### 3.1 Steps
1. **Initiation (Switchboard or API)**
   - User selects target system, operation type, scope, timebound, and justification.
   - Frontend calls `POST /high-risk-ops/requests`.
2. **Policy preflight**
   - API calls policy engine (`/v1/policy/decide`) with subject/action/resource/context.
   - Response includes `allowed`, `approval_chain`, and constraints (e.g., duration cap, logging requirements).
   - Denied requests return explanation + policy trace; no request is created.
3. **Request creation + evidence**
   - Allowed requests create `HighRiskOperationRequest` with `status=pending_approval` and emit `highRiskOp.request.created` evidence.
4. **Approvals**
   - Switchboard Approvals Center queues requests per policy (e.g., Security, Infra).
   - Approvers see risk summary, similar requests, policy trace, and blast radius.
   - Actions: `approve`, `reject`, `request_changes`, each emitting `Approval` evidence.
5. **Execution**
   - When approvals are satisfied, workflow engine executes via adapters (Terraform, IAM, DB credential issuer).
   - Adapters re-check policy at execution time and emit receipts.
6. **Closure**
   - Update `HighRiskOperationRequest.status` (`completed`, `failed`, `expired`) and attach a `Receipt`.
   - Schedule automatic **revert** for time-limited operations with evidence events.

## 4. Policy Bundle (OPA/ABAC sketch)

### 4.1 Attributes
- **Subject (user):** `id`, `teams`, `roles`, `clearance_level`, `oncall_status`, `employment_type`.
- **Resource (system/env):** `system_type`, `environment`, `tenant_id`, `data_classification`.
- **Action (operation_type):** `risk_score`, `category`, `max_duration`.
- **Context:** `time_of_day`, `request_origin`, `change_ticket_id`, `incident_id`.

### 4.2 Example Rego (pseudocode)
```rego
package high_risk.operations

default allow = false

required_approvals := {"levels": []}

# Only engineers/oncall can request certain ops in prod
allow {
  input.subject.roles[_] == "engineer"
  input.resource.environment == "prod"
  input.action.category == "access_grant"
  not too_long
  not high_risk_restricted
}

too_long {
  input.request.duration_hours > max_duration
}

max_duration := 2 {
  input.action.risk_score >= 8
}

max_duration := 8 {
  input.action.risk_score < 8
}

high_risk_restricted {
  input.resource.data_classification == "restricted"
  not is_oncall_or_sec
}

is_oncall_or_sec {
  input.subject.oncall_status == true
} else {
  input.subject.roles[_] == "security_officer"
}

required_approvals := {"levels": ["team_lead", "security_officer"]} {
  input.action.risk_score >= 7
}

required_approvals := {"levels": ["team_lead"]} {
  input.action.risk_score < 7
}
```

Ship policy modules for request eligibility, approval requirements, and conditional controls, plus a simulation harness that returns allow/deny, required approvals, and constraints for any user/system/operation tuple.

## 5. Tests

### 5.1 Acceptance tests (behavioral)
- `engineer_can_request_temp_prod_read_with_team_lead_and_sec_approval`
- `contractor_cannot_request_restricted_data_access`
- `expired_request_cannot_be_executed_even_if_approved`
- `all_executed_ops_have_receipts_and_evidence_attached`
- `policy_update_changes_required_approvals_without_deploy`

### 5.2 Policy regression tests
- Table-driven cases per `HighRiskOperationType` covering inputs → `allow/deny`, `required_approvals`, `max_duration`.
- Golden policy decision snapshots rerun in CI on every change.

### 5.3 Integration tests
- Stand up policy engine, workflow engine, and mock adapter (e.g., IAM).
- Validate request → approval → execution → revert lifecycle, provenance events, and denial/expiry/failure paths.

## 6. Evidence & Receipts

### 6.1 Receipt schema (simplified)
```json
{
  "id": "receipt_123",
  "operation_request_id": "hro_456",
  "actor": {
    "id": "user_789",
    "type": "system|human"
  },
  "action": "EXECUTE_HIGH_RISK_OPERATION",
  "resource": {
    "system_id": "pg_prod_1",
    "tenant_id": "tenant_abc"
  },
  "policy_decision": {
    "bundle_version": "v2025.01.03",
    "allow": true,
    "required_approvals": ["team_lead", "security_officer"],
    "evaluation_trace_ref": "evidence_321"
  },
  "timestamp": "2025-01-03T18:23:11Z",
  "hash": "…",
  "notary_txn_id": "…"
}
```

### 6.2 Evidence bundle contents
- Initial request payload (normalized, redacted).
- Policy input + decision + trace.
- Approval trail (who, when, rationale).
- Execution logs from adapter.
- Revert logs (if time-bound).
- Hash chain + optional external notary attestation.

Provide an export format for auditors: `GET /evidence/high-risk-ops?from=…&to=…&tenant=…` returns a zipped bundle with manifest.

## 7. Dashboards & Alerts (Observability Pack)

### 7.1 SLOs
- **High-Risk Request Latency:** p95 creation → first decision < **10 minutes** (business hours).
- **Execution Safety:** 100% executed high-risk ops have a `Receipt`, at least one `PolicyDecision`, and required `Approval`s linked.
- **Policy Coverage:** 100% of `HighRiskOperationType`s mapped to at least one active policy rule.

### 7.2 Metrics
- `high_risk_ops.requests_total{type, env, tenant, status}`
- `high_risk_ops.approval_latency_seconds{type, env, approver_role}`
- `high_risk_ops.missing_receipt_total`
- `high_risk_ops.policy_denies_total{reason}`

### 7.3 Dashboards
- **Security Ops View:** Volume by type/env; top requesters/systems; approvals by role; average latency.
- **Risk & Compliance View:** Trend over time; deny reasons; % time-bound ops that properly reverted.

### 7.4 Alerts
- `missing_receipt_total > 0` over 5 minutes → page SRE/SecOps (possible side door).
- `status=pending_approval` > X hours in `prod` → notify owner.
- Sudden spike on one system/tenant → anomaly alert → incident hook.

## 8. Runbook Snippet: Investigate high-risk operation anomaly
1. **Trigger:** Alert on `high_risk_ops.requests_total` spike or `missing_receipt_total > 0`.
2. **Immediate steps:** Open Switchboard → Incident & Runbook Hub → “High-Risk Ops Anomaly”; filter last N minutes by type/env/system.
3. **Triage:** Check user/team clustering, incident/change ticket links, and approval completeness.
4. **Containment:** Revoke granted accesses; temporarily tighten policy (e.g., require security officer for all `prod`); flag users/systems in graph with `under_investigation=true`.
5. **Post-incident:** Export evidence bundle; link incident record to affected requests; add policy tests to prevent recurrence.

## 9. Packaging (Helm/Terraform + Seed Data)

### 9.1 Helm/Terraform modules
- `high-risk-ops` chart/module enabling workflows/APIs, deploying policy bundles, configuring adapters, and wiring metrics to observability.
- Example values:
  ```yaml
  highRiskOps:
    enabled: true
    defaultMaxDurationHours: 4
    riskScoreThresholds:
      requireSecurityOfficer: 7
    adapters:
      postgres:
        enabled: true
        instances:
          - name: "pg-prod-1"
            connectionRef: "secret://pg-prod-1"
            environment: "prod"
            tenantTag: "primary"
  ```

### 9.2 Seed data & templates
- Seed high-risk operation types, internal vs. strict policy sets, dashboards, runbook templates, and demo users/systems.
- Provide a quick-start script to create sample high-risk ops to populate dashboards.

## 10. Changelog (perf, cost, security)
- **Feature:** High-Risk Ops & Security Approvals Pack (v0.1).
- **Perf impact:** +1–2 low-latency policy calls per high-risk op; additional provenance writes (1 receipt + ~5 evidence docs/op).
- **Cost impact:** More compute/storage from evidence volume and dashboard queries, mitigated by evidence compaction and configurable retention per tenant/tier.
- **Security impact:** Removes side-door execution for onboarded systems; provides manifest of all high-risk ops with policy decisions + approvals.
