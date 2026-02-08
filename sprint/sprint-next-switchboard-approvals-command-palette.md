# Sprint Next: Switchboard Approvals + Command Palette (2 weeks)

## Objective
Ship a production-grade **Approvals + Command Palette** vertical slice in Switchboard that is **OPA/ABAC gated**, emits **signed provenance receipts** for every action, and is **operable** (SLOs + dashboards + runbooks). This aligns with the Summit Readiness Assertion and preserves the governed execution spine.

## Scope (Committed)
1. **Switchboard UX**: Command Palette → Approval → Receipt
2. **Policy Layer**: OPA/ABAC gating + simulation preflight
3. **Provenance**: Receipt schema + Notary adapter v1
4. **Backend APIs**: commands, approvals, timeline, receipts
5. **Observability**: dashboards, alerts, runbooks

## Architecture & Authority Alignment
- **Authority Files**: Summit Readiness Assertion, GA governance rules, and decision-policy versioning.
- **Definitions**: Command, Approval, Policy Decision, Receipt align to `openapi/switchboard-approvals-command-palette.yaml` and `provenance/receipt_schema_switchboard_v0_1.json`.
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: policy bypass, approval spoofing, receipt tampering, tool abuse.
- **Mitigations**: default-deny policy, required-approver sets, signature verification, audit-ready receipts.

## Jira-Ready Sprint Board

### Epic SB-100: Command Palette → Approval → Receipt (UX)
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-101 | Command Palette search + recent + role-scoped commands | Search, recent list, role scoping shipped | 5 | SB-301, SB-401 |
| SB-102 | Approvals Center UI | Diff, risk level, policy decision, rationale, approver set | 5 | SB-301, SB-401 |
| SB-103 | Receipt Viewer UI | Show receipt, verify status, export | 3 | SB-401, SB-501 |

### Epic SB-200: OPA/ABAC Gating + Simulation
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-201 | Policy bundle: approve/deny/execute/access_request | 90%+ privileged flows gated | 5 | SB-401 |
| SB-202 | Policy simulation endpoint + UI | “Why blocked?” view in UI | 3 | SB-401 |
| SB-203 | Policy regression suite | Privileged flows covered | 3 | SB-201 |

### Epic SB-300: Approvals Service (State Machine)
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-301 | Approval state machine + idempotency | Approve/deny with rationale | 5 | SB-401 |
| SB-302 | Approval audit trail + receipts | Emits receipt on decision | 3 | SB-401, SB-501 |

### Epic SB-400: Command Execution API
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-401 | Execute command API + policy preflight | p95 < 1.5s (preflight + enqueue) | 5 | SB-201 |
| SB-402 | Workflow enqueue + timeline integration | Timeline update within 2s | 3 | SB-501 |

### Epic SB-500: Provenance + Receipts
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-501 | Receipt schema v0.1 + signer/verifier | Signature verified in API test | 5 | SB-401 |
| SB-502 | Selective disclosure API | PII redaction with hash chain | 3 | SB-501 |

### Epic SB-600: Observability + Operability
| ID | Story | Acceptance | Est | Dependencies |
| --- | --- | --- | --- | --- |
| SB-601 | Grafana dashboards | Latency, error rate, approvals cycle time | 3 | SB-401, SB-501 |
| SB-602 | Alert rules | Error budget burn + receipt verify failures | 2 | SB-601 |
| SB-603 | Runbooks | Approvals stuck, OPA slow, receipt verify failing | 2 | SB-601 |

## Delivery Checklist (DoD)
- Unit + integration tests for critical paths (≥80%).
- Policy regression suite for privileged flows.
- SBOM + SLSA attestation generated in CI.
- Receipts verifiable end-to-end in staging.
- Dashboards + alerts deployed and linked from runbooks.
- OAS3 + TS SDK published (internal).
- Short changelog includes perf + cost impact.

## Demo Spine (Staging)
1. Operator runs “Request elevated access” via Command Palette.
2. Policy requires approval → routed to Approvals Center.
3. Reviewer approves with rationale.
4. Command executes → Timeline shows action + Receipt.
5. Verify receipt → verification succeeds.
6. Show dashboard panel for approval cycle time + policy denies.

## Risks + Mitigations
- **OPA latency risk** → warm policy cache, enforce timeouts, emit deny receipt on timeout.
- **Receipt signing latency** → async signing pipeline with verified enqueue receipts.
- **Approval backlog** → alert on cycle time SLO breaches.

## Forward-Leaning Enhancement
Add **policy simulation diffing**: show which input fields and attributes tipped the decision (feature-flagged for internal dogfooding).

## Outcome
This sprint establishes a governed execution spine for Switchboard and dictates the next sprint’s implementation milestones with immutable policy, receipt, and observability contracts.
