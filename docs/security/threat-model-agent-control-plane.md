# Threat Model — Agent Control Plane

**Item slug:** agent-fleet-control-plane-2027
**Evidence IDs:** EVD-AFCP-POLICY-004
**Classification:** internal

---

## 1. Scope

This threat model covers the Summit Agent Control Plane as defined in
`docs/architecture/agent-control-plane-2027.md`.  It does not cover the
underlying LLM providers or external connectors (covered in their own models).

---

## 2. Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API ingress | External requests enter via authenticated API gateway |
| Control plane | Registry, PDP, Router, Planner (trusted internal) |
| Agent execution | Tool executors and agent runtimes (semi-trusted) |
| External tools | Web search, databases, file systems (untrusted) |
| Knowledge graph | Neo4j (trusted internal read, write via policy) |
| Human approval | Human operator via authenticated UI (trusted) |

---

## 3. Threat Catalogue

### T-001 — Agent Sprawl
**Description:** Unregistered or undocumented agents invoke tools without governance oversight.
**Impact:** Unauthorized automation; data exfiltration; policy bypass.
**Controls:**
- `AgentRegistry.register()` validates all descriptor fields before admission.
- PDP deny-by-default: agents without registered descriptors cannot be routed.
- CI `agent-policy-check` blocks merge if required source files are absent.

### T-002 — Over-Privileged Agent
**Description:** Agent descriptor declares broader tool or dataset scope than needed.
**Impact:** Violates least-privilege; increases blast radius.
**Controls:**
- Router eligibility filter: `toolScopeAllows` and `dataScopeAllows` enforce declared scope.
- PDP rule 1 (`TOOL_SCOPE_DENIED`) and rule 2 (`DATASET_SCOPE_DENIED`) block runtime scope creep.
- Negative test: `deny-fixtures.test.ts` — tool outside authorised scope.

### T-003 — Prompt Injection via Retrieved Context
**Description:** Malicious content in a retrieved graph node poisons the task goal or agent instructions.
**Impact:** Workflow compromise; data exfiltration; agent misdirection.
**Controls:**
- Graph context compiler strips non-policy-authorized edges (Stage 3 policy trim).
- Context package is typed (`GraphContextPackage`); raw strings from the graph are not executed.
- Innovation lane: poisoned-context fixtures will be added when Stage 3 is fully implemented.

### T-004 — Restricted Data Access Without Approval
**Description:** Agent attempts to read or write `restricted`-classified data without a human approval grant.
**Impact:** Regulatory non-compliance; data breach.
**Controls:**
- PDP rule 3 (`RESTRICTED_REQUIRES_APPROVAL`): blocks execution.
- Router: `requiresApproval` flag propagated to `RouteDecision.requiresHumanApproval`.
- CI deny fixture: `RESTRICTED_REQUIRES_APPROVAL` case.

### T-005 — Infinite Loop / Runaway Agent
**Description:** Agent or saga enters an infinite execution loop, consuming unbounded resources.
**Impact:** DoS; cost overrun; cascading failures.
**Controls:**
- `SagaRuntime`: `MAX_HOPS = 10` hard limit per saga.
- `SagaRuntime`: `MAX_RETRIES_PER_STEP = 3` per step.
- FlightRecorder emits `TASK_FAILED` with `MAX_HOP_LIMIT_EXCEEDED` reason.
- Innovation lane: loop-timeout tests.

### T-006 — Non-Deterministic Routing of Dangerous Actions
**Description:** Router selects different agents on repeated calls due to non-determinism, creating unpredictable blast-radius outcomes.
**Impact:** Unpredictable governance; audit trail gaps.
**Controls:**
- `routeTask` is fully deterministic: stable lexical tie-break guarantees identical output for identical inputs.
- CI `router-determinism-check`: 10 consecutive identical calls must produce identical output.

### T-007 — Sensitive Data in Telemetry
**Description:** Raw secrets, tokens, or customer PII appear in FlightRecorder output.
**Impact:** Credential leakage; privacy violation.
**Controls:**
- `NEVER_LOG_FIELDS` constant in `TraceEnvelope.ts`.
- `FlightRecorder.sanitise()` strips these fields before storage.
- Never-log fields: `rawSecret`, `token`, `password`, `customerPIIPayload`, `approvalJustificationBody`.

### T-008 — Supply Chain Compromise
**Description:** A new runtime dependency introduces malicious code into the control plane.
**Impact:** Full system compromise.
**Controls:**
- `dependency-delta-check` CI gate (innovation lane).
- Lockfile diff required in PRs touching control-plane modules.
- No new runtime dependencies introduced in the foundation lane.

---

## 4. Residual Risks

| Risk | Status |
|------|--------|
| T-003 — Prompt injection (full mitigation) | Innovation lane (Stage 3 policy trim) |
| T-008 — Supply chain (full mitigation) | Innovation lane (dependency-delta-check) |
| Human Authority Gateway audit trail | Innovation lane |

---

## 5. Security Checklist (per PR)

- [ ] No new runtime dependencies without dependency-delta doc.
- [ ] No raw secrets or PII in telemetry payloads.
- [ ] All new agents registered with valid descriptors.
- [ ] PDP deny rules tested with negative fixtures.
- [ ] Router determinism verified.
- [ ] Evidence files updated.
