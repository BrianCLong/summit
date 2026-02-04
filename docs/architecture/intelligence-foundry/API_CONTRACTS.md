# Intelligence Foundry API Contracts (v0.1)

This defines minimal interfaces. Implementations MAY be REST, gRPC, or event-driven, but semantics MUST hold.

## 1. Work Order API

### SubmitWorkOrder

Request:

- tenant_id
- principal_id
- policy_ref (policy_id + hash)
- agent_ref (optional)
- inputs:
  - assets: list(asset_id, content_hash)
  - prompt: (prompt_text OR prompt_asset_id) + hash
- requested_outputs:
  - type
  - destination_ref (must be policy-allowed)
  - sensitivity_label

Response:

- work_order_id
- accepted_at
- initial_status

### GetWorkOrder

- returns work order + status + references to evidence (if available)

## 2. Policy Decision API

### EvaluateAccess

Inputs:

- principal_id
- policy_ref
- resource (asset/model/tool)
- action (read/write/train/infer/export)
- parameters (for tools)

Outputs:

- decision (allow|deny)
- reason_codes
- decision_hash
- timestamp

All decisions MUST be logged into provenance.

## 3. Execution Events (Event Bus)

### WorkOrderAccepted

### WorkOrderStarted

### ToolCallRequested

### ToolCallCompleted

### InferenceRunCompleted

### WorkOrderCompleted

### EvidenceBundleSealed

Events MUST carry:

- tenant_id
- work_order_id
- policy_hash
- event_hash
- correlation_id
- references to artifacts/hashes

## 4. Evidence Retrieval API

### GetEvidenceBundle

Returns:

- bundle manifest
- signed attestation(s)
- deterministic execution_graph.json
- policy_decisions.json

Verification MUST be possible offline.
