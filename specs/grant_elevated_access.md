# Grant Elevated Access – Implementation Blueprint

This blueprint translates the "grant_elevated_access" slice into an execution-ready plan for backend and policy engineers. It defines the request/approval lifecycle, API shapes, data model, policy contract, evidence/receipt format, and observability hooks required to ship the flow end-to-end.

## Scope & Assumptions
- Operation is **always approval-gated** in this slice (no auto-allow path).
- CompanyOS hosts ApprovalService, Policy (OPA), and Provenance services; IdentityAdapter integrates with the IdP/SCIM provider.
- Switchboard is the client surface for requesters and approvers; Observers consume receipts for audit/IR.

## Actors
- **requester**: initiates elevated access.
- **approver**: must be authorized by policy to approve.
- **CompanyOS**: Approval + Policy + Provenance services.
- **IdentityAdapter**: IdP/SCIM client to grant the role.

## Happy Path Sequence (Grant Flow)
1. **Requester** submits via Switchboard → `POST /approvals`.
2. **ApprovalService** evaluates OPA (`evaluate(grant_elevated_access, attrs)`), stores approval in `PENDING`.
3. **Approver** fetches queue (`GET /approvals?status=pending` → `GET /approvals/{id}`) and may run `/policy/simulate`.
4. **Approver** submits decision via `POST /approvals/{id}/decision` with rationale.
5. **Decision Handler**:
   - Revalidates via OPA (approver authorization + final allow/deny).
   - On approve → `IdentityAdapter.grantRole(user, tenant, role)`.
   - Builds `EvidenceBundle` and calls `ProvenanceService.recordEvidence(bundle)`; stores `receipt_id` on approval.
6. **Switchboard** refreshes status, shows receipt metadata, and emits timeline entry with receipt link.
7. **Observer** can retrieve receipt via `GET /receipts/{id}` for audit/IR.

## API Surface (OAS3 Sketch)
Endpoints and schemas are defined to drop directly into an OpenAPI document.

```yaml
paths:
  /approvals:
    post:
      summary: Create approval request
      operationId: createApproval
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateApprovalRequest'
      responses:
        '201':
          description: Approval created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Approval'
  /approvals/{id}:
    get:
      summary: Get approval by id
      operationId: getApproval
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Approval
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Approval'

  /approvals/{id}/decision:
    post:
      summary: Submit approval decision
      operationId: decideApproval
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApprovalDecisionRequest'
      responses:
        '200':
          description: Updated approval
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Approval'

  /policy/simulate:
    post:
      summary: Simulate policy decision
      operationId: simulatePolicy
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PolicySimulationRequest'
      responses:
        '200':
          description: Simulation result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicySimulationResult'

  /receipts/{id}:
    get:
      summary: Retrieve receipt & evidence handle
      operationId: getReceipt
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Receipt
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Receipt'

components:
  schemas:
    CreateApprovalRequest:
      type: object
      required: [operation, target, attributes]
      properties:
        operation:
          type: string
          enum: [grant_elevated_access]
        target:
          type: object
          required: [userId, tenantId]
          properties:
            userId: { type: string }
            tenantId: { type: string }
        attributes:
          type: object
          description: ABAC input (role requested, env, jurisdiction, etc.)

    Approval:
      type: object
      required: [id, operation, status, requesterId, target, createdAt]
      properties:
        id: { type: string }
        operation: { type: string }
        requesterId: { type: string }
        approverId: { type: string, nullable: true }
        target:
          $ref: '#/components/schemas/Target'
        attributes:
          type: object
        status:
          type: string
          enum: [PENDING, APPROVED, REJECTED]
        rationale: { type: string, nullable: true }
        receiptId: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        decidedAt: { type: string, format: date-time, nullable: true }

    Target:
      type: object
      properties:
        userId: { type: string }
        tenantId: { type: string }
        role: { type: string }

    ApprovalDecisionRequest:
      type: object
      required: [decision, rationale]
      properties:
        decision:
          type: string
          enum: [APPROVED, REJECTED]
        rationale:
          type: string

    PolicySimulationRequest:
      type: object
      required: [operation, attributes]
      properties:
        operation: { type: string }
        attributes:
          type: object

    PolicySimulationResult:
      type: object
      properties:
        allow: { type: boolean }
        requiresApproval: { type: boolean }
        reasons:
          type: array
          items: { type: string }

    Receipt:
      type: object
      required: [id, operation, outcome, evidenceHash, createdAt]
      properties:
        id: { type: string }
        operation: { type: string }
        approvalId: { type: string }
        outcome: { type: string }
        evidenceHash: { type: string }
        evidenceLocation: { type: string }
        createdAt: { type: string, format: date-time }
```

## Minimal Data Model
- **approvals**
  - `id` (uuid, pk)
  - `operation` (text)
  - `requester_id` (text)
  - `target_user_id` (text)
  - `tenant_id` (text)
  - `requested_role` (text)
  - `attributes` (jsonb)
  - `status` (enum: PENDING, APPROVED, REJECTED)
  - `rationale` (text)
  - `approver_id` (text, nullable)
  - `receipt_id` (uuid, nullable)
  - `created_at` (timestamptz)
  - `decided_at` (timestamptz, nullable)

- **evidence_bundles**
  - `id` (uuid, pk)
  - `approval_id` (uuid, fk)
  - `bundle` (jsonb)
  - `hash` (text)
  - `policy_version` (text)
  - `notary_ref` (text, nullable)
  - `created_at` (timestamptz)

- **receipts**
  - `id` (uuid, pk)
  - `approval_id` (uuid, fk)
  - `operation` (text)
  - `outcome` (text)
  - `evidence_hash` (text)
  - `evidence_bundle_id` (uuid)
  - `created_at` (timestamptz)

## OPA / ABAC Policy (Rego)
```rego
package companyos.approvals

default allow = false
default requires_approval = true

allow {
  input.operation == "grant_elevated_access"
  input.environment.env == "prod"
  input.requester.role == "org_admin"
  input.target.tenant_id == input.requester.tenant_id
}

requires_approval {
  input.operation == "grant_elevated_access"
}

can_approve {
  input.operation == "grant_elevated_access"
  input.approver.role == "security_admin"
  input.approver.tenant_id == input.target.tenant_id
}

decision := {
  "allow": allow,
  "requires_approval": requires_approval,
  "can_approve": can_approve,
}
```

## Evidence & Receipt Shapes
- **Evidence bundle (internal):**
  - Includes request context (requester/target/tenant/role/attributes), decision details (approver/outcome/rationale/timestamp), policy bundle version + input hash, notary metadata, and created timestamp.
- **Receipt (external):**
  - Contains receipt ID, operation, approval ID, outcome, evidence hash, evidence location reference, created timestamp.

### Reference JSON

**Evidence bundle**

```json
{
  "id": "eb_123",
  "operation": "grant_elevated_access",
  "approvalId": "appr_123",
  "request": {
    "requesterId": "user_req",
    "targetUserId": "user_target",
    "tenantId": "tenant_1",
    "requestedRole": "admin",
    "attributes": {
      "env": "prod",
      "jurisdiction": "US",
      "riskTier": "high"
    }
  },
  "decision": {
    "approverId": "user_approver",
    "outcome": "APPROVED",
    "rationale": "Oncall rotation; ticket #123",
    "decidedAt": "2025-11-28T10:00:00Z"
  },
  "policy": {
    "bundleVersion": "v1.0.0",
    "input": {},
    "result": {
      "allow": true,
      "requiresApproval": true,
      "canApprove": true
    }
  },
  "notary": {
    "hash": "sha256:...",
    "adapter": "stub",
    "reference": "stub:123"
  },
  "createdAt": "2025-11-28T10:00:01Z"
}
```

**Receipt**

```json
{
  "id": "rcpt_123",
  "operation": "grant_elevated_access",
  "approvalId": "appr_123",
  "outcome": "APPROVED",
  "evidenceHash": "sha256:...",
  "evidenceLocation": "evidence_bundles/eb_123",
  "createdAt": "2025-11-28T10:00:01Z"
}
```

## Observability Contract
- **Metrics**
  - `companyos_approvals_requests_total{operation, status_code}`
  - `companyos_approvals_request_duration_seconds{operation, endpoint}`
  - `companyos_provenance_writes_total{status="success|error"}`
  - `companyos_policy_decisions_total{operation, outcome="allow|deny"}`
- **Tracing**
  - Spans: `approvals.create`, `approvals.decide`, `opa.evaluate`, `provenance.recordEvidence`, `notary.notarize`, `identity.grantRole`.
  - Propagate `approval_id` and `receipt_id` as trace attributes.

## Runbook Skeleton (for grant_elevated_access)
1. **Overview** – Purpose of elevated access and approval flow.
2. **How to Request** – Steps in Switchboard and expected result.
3. **How to Approve/Reject** – Using Approvals Center, reviewing context, providing rationale.
4. **How to Troubleshoot** – OPA simulation, logs/traces by `approval_id`, common error codes.
5. **How to Retrieve Evidence/Receipts** – Switchboard timeline + receipt link; API `GET /receipts/{id}`.
6. **SLOs & Alerts** – Define alerts on request latency/error rates and provenance write failures.

## Forward-Looking Enhancements
- Add adaptive risk scoring to `attributes` and gate expedited paths via `requires_approval` toggle.
- Integrate cryptographic notarization of `evidence_hash` (e.g., transparency log) for tamper-evident receipts.
- Pre-compute policy simulation results for inbox batching to reduce decision latency per approval.
