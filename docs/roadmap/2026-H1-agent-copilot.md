# Summit Agent & Copilot Platform Roadmap

**H1 2026 (Two Quarters)**

## Objectives (Top-Line)

* Standardize **MCP-first** tool access and context ingestion across all agents.
* Ship a **production agent runtime** with multi-tool orchestration, streaming, and governance.
* Elevate from prompt engineering to **deterministic context engineering** with auditable pipelines.
* Deliver **enterprise-grade tool governance** (registry, approvals, isolation, policy).

---

## **Q1 2026 (Weeks 1–12): Foundation & Convergence**

### 1) MCP-First Integration Baseline

**Owner:** Platform Architect
**Deliverables**

* `packages/mcp/` canonical library (JSON-RPC client/server, schema validation).
* MCP adapters for: Evidence APIs, IntelGraph read/write, Governance Ledger.
* MCP spec conformance tests (golden vectors).

**Evidence**

* `evidence/mcp/conformance.json`
* CI gate: `verify_mcp_contracts.mjs`

**Risks**

* Spec drift across vendors → mitigate with pinned version + compatibility layer.

---

### 2) Agent Runtime v1 (Embedded SDK)

**Owner:** Agent Runtime Lead
**Deliverables**

* Persistent agent lifecycle (stateful context, resumable tasks).
* Multi-model routing (policy-driven selection).
* Streaming execution + tool calls.
* Native MCP server registration.

**Evidence**

* `runtime/agent_runtime_v1.report.json`
* Load/soak benchmarks, replay logs.

**Risks**

* SDK churn → abstraction boundary + contract tests.

---

### 3) Tool Governance & Registry (Internal)

**Owner:** Security & Governance Lead
**Deliverables**

* Tool Registry (approval, versioning, scopes, blast-radius labels).
* Policy engine: allow/deny, rate limits, sandboxing.
* Audit hooks into Security Ledger.

**Evidence**

* `governance/tool_registry.yaml`
* SOC-2 control mappings.

**Risks**

* Over-permissive defaults → deny-by-default policy.

---

### 4) Context Engineering v1

**Owner:** Data Platform Lead
**Deliverables**

* Structured context pipelines (sources → transforms → envelopes).
* Context budgets + prioritization.
* Deterministic context hashing.

**Evidence**

* `context/pipelines/*.yaml`
* `context/hash_manifest.json`

**Risks**

* Context bloat → strict budgets + eviction policy.

---

**Q1 Exit Criteria**

* All agents consume tools **only via MCP**.
* Agent Runtime v1 in production behind feature flag.
* Tool Registry enforced in CI and runtime.

---

## **Q2 2026 (Weeks 13–24): Scale, Safety, Differentiation**

### 5) Advanced Multi-Tool Orchestration

**Owner:** Agent Runtime Lead
**Deliverables**

* Tool-graph planning (parallelism, retries, compensation).
* Secure execution sandboxes (FS, network, secrets).
* Failure recovery + human-in-the-loop checkpoints.

**Evidence**

* `runtime/tool_graph_tests.json`
* Incident simulations.

**Risks**

* Security surface expansion → isolation + least privilege.

---

### 6) Enterprise Agent Governance Pack

**Owner:** Compliance Lead
**Deliverables**

* Agent roles & permissions (AGENTS.md enforcement).
* Versioned prompts & contexts registry.
* Drift detection (prompt/context/tool deltas).

**Evidence**

* `governance/agent_roles.yaml`
* Drift reports.

**Risks**

* Governance friction → self-service approvals with guardrails.

---

### 7) Observability, Lineage & Provenance

**Owner:** Observability Lead
**Deliverables**

* End-to-end traces (context → tool → output).
* Lineage artifacts aligned with provenance standards.
* Evidence freshness scoring.

**Evidence**

* `observability/traces/*.json`
* Provenance attestations.

**Risks**

* Signal overload → sampled traces + tiered retention.

---

### 8) PR & Market Readiness

**Owner:** Product Marketing
**Deliverables**

* Public announcement: “MCP-Native, Governed Agents.”
* Technical blog: Context Engineering vs Prompting.
* Customer demos with live orchestration.

**Evidence**

* `docs/marketing/agent_framework.md`
* Demo recordings + claims checklist.

**Risks**

* Over-claiming → CI-validated marketing claims.

---

**Q2 Exit Criteria**

* Multi-tool agents operating safely at scale.
* Full auditability from context ingestion to action.
* External messaging aligned with delivered capabilities.

---

## **RACI Snapshot**

| Area            | R             | A    | C        | I       |
| --------------- | ------------- | ---- | -------- | ------- |
| MCP Integration | Platform      | CTO  | Security | Eng     |
| Agent Runtime   | Runtime       | CTO  | Platform | Product |
| Tool Governance | Security      | CISO | Platform | Eng     |
| Context Eng     | Data          | CTO  | Runtime  | Product |
| Observability   | Observability | CTO  | Security | Eng     |
| PR              | Marketing     | CEO  | Product  | All     |

---

## **KPIs**

* % tools accessed via MCP (target: 100%)
* Mean agent task success rate (≥99%)
* Time-to-approve new tool (≤1 day)
* Evidence completeness score (≥98%)
