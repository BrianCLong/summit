# Summit Agentic Era Extraction (Genesis & Synthesis Article)

**Source access status:** Article quotations are **Deferred pending source access via proxy allowlist**. This blueprint intentionally avoids direct article quotes until retrieval is unblocked; all statements below are grounded in Summit governance authorities and current platform objectives.

**Authority alignment (binding):**

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- Agent Mandates & GA Guardrails: `docs/governance/AGENT_MANDATES.md`, `docs/ga/`
- GA Hardening Contract: `agent-contract.json`

## 1) Executive Extraction (<=12 bullets)

- [ARCH] Adopt archetype-specific agent runtimes (RAG, Voice, Coding, CUA) so each has tuned planners/executors. Why it matters: reduces latency and errors by constraining behaviors to domain tools.
- [BACKLOG] Implement agent-to-agent (A2A/MCP-style) protocol adapters to orchestrate multi-agent handoffs with provenance. Why it matters: unlocks composable workflows across internal and partner agents.
- [ARCH] Standardize planner/executor/reviewer pattern with human-in-the-loop gates for high-risk steps. Why it matters: provides audit-ready checkpoints and mitigates automation drift, fully aligned to HITL mode in readiness assertion.
- [RISK] Prompt-injection and data exfiltration become dominant threats as agents gain tool autonomy. Why it matters: requires policy enforcement, sandboxing, and redaction by default.
- [METRIC] Track agent ROI via cost-per-task, intervention rate, and citation precision. Why it matters: ties experimentation to business outcomes and defensible budgets.
- [BACKLOG] Build deep research agent pattern that iterates search → summarize → verify with citations. Why it matters: improves trust and supports analyst-grade outputs.
- [ARCH] Introduce computer-using agent sandbox with browser/desktop isolation and I/O allowlists. Why it matters: enables UI-driven automation without breaching tenant boundaries.
- [GTM] Package industry archetypes (investigation copilot, coding assistant, voice intake) as templates. Why it matters: accelerates adoption and shows clear value paths.
- [BACKLOG] Add protocol-aware tool gateway so MCP/A2A tools share schemas, auth, and quotas. Why it matters: simplifies onboarding external tools and enforces governance.
- [RISK] Coding agents risk unsafe diffs and self-modification. Why it matters: enforce diff review, unit-test proofs, and policy checks before apply as governed exceptions with explicit approvals.
- [ARCH] Memory tiering (scratch, vector, graph, event log) with retention and redaction rules. Why it matters: balances recall quality with compliance obligations and supports immutable provenance.
- [METRIC] Observe p95 step latency and tool error rate per archetype. Why it matters: pinpoints bottlenecks and resilience gaps.

## 2) Taxonomy → Summit Mapping Matrix

| Article concept/archetype   | What Summit already has           | What Summit needs (capabilities + interfaces)                                  | Suggested Summit module(s)/services          | Data/provenance implications                           | Policy/guardrail implications                                             |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Agentic RAG                 | Graph + RAG primitives, citations | Planner/executor tuned for retrieval tasks; adaptive chunking; citation ledger | "RAG Orchestrator", "Citation Ledger"        | Evidence objects tied to graph nodes; chunk lineage    | OPA checks on source scopes; auto-redaction on export                     |
| Voice Agents                | React/Node frontends; auth        | Streaming ASR/TTS interface; voice session manager; sentiment/safety filters   | "Voice Gateway", "Conversation Orchestrator" | Store transcripts with speaker metadata; consent flags | Rate limits; content safety; PII masking in transcripts                   |
| Agent Protocols (A2A/MCP)   | Internal orchestration hooks      | Protocol adapters, capability registry, signed tool manifests                  | "Tool Gateway", "Agent Bridge"               | Step-level provenance including remote agent IDs       | Allowlist tools; per-tenant capability grants; audit of cross-agent calls |
| DeepResearch                | Basic search connectors           | Iterative search-plan-review loop; fact-checkers; citation coverage scoring    | "Research Planner", "Verifier"               | Evidence bundles referencing sources and verdicts      | Require verification threshold; block publish if citations fail           |
| Coding Agents               | CI/CD, repo                       | Diff planning, test harness runner, policy gates (OPA/semgrep), sandbox apply  | "Dev Agent Runtime", "Policy Guard"          | Provenance for code edits, test evidence               | Disallow privileged commands; human approval gate; artifact retention     |
| Computer-Using Agents (CUA) | Browser harnesses; limited RPA    | Secure browser/desktop sandbox with DOM tool APIs; replayable traces           | "CUA Sandbox", "UI Toolkit"                  | Capture DOM snapshots, input logs; redact secrets      | Network/clipboard restrictions; domain allowlist; runtime quotas          |

## 3) Architecture Blueprint (MVP → GA)

**Diagram in words**

- Client (React) → GraphQL API (policy-aware) → Agent Orchestrator
  - Planner (LLM) → Task Graph → Executor (tool-calling runtime) → Reviewer (LLM/human gate)
  - Tooling layer: Tool Gateway (MCP/A2A adapters, schema registry), connectors (search, code, browser, data), auth + quota
  - Memory: scratch store (Redis), vector store (pgvector/Neo4j embeddings), graph memory (Neo4j entities/relations), event log (append-only PostgreSQL/Prov Ledger)
  - Provenance: Evidence objects per step, citation ledger, artifact store, governed-exception ledger for overrides
  - Observability: Trace collector (OpenTelemetry), cost meter, quality signals
  - Security: OPA policy engine, prompt firewall, sandbox manager (code/CUA), data lineage verifier

**Interfaces/contracts (TypeScript-ish)**

```ts
interface AgentTask {
  id: string;
  archetype: "rag" | "voice" | "research" | "coding" | "cua";
  goal: string;
  inputs: Record<string, unknown>;
  tenantId: string;
  riskTier: "low" | "med" | "high";
}
interface PlanStep {
  id: string;
  taskId: string;
  action: string;
  tool?: string;
  expectedEvidence?: string[];
  guard?: GuardRail;
}
interface GuardRail {
  policyRef: string;
  requiredApproval?: "human" | "auto";
  redactionRules?: string[];
}
interface ToolDescriptor {
  name: string;
  protocol: "mcp" | "a2a" | "local";
  schema: JSONSchema;
  scopes: string[];
  costLimit?: number;
}
interface MemoryWrite {
  taskId: string;
  tier: "scratch" | "vector" | "graph" | "event";
  payload: unknown;
  retentionDays: number;
  piiTags?: string[];
}
interface EvidenceRecord {
  stepId: string;
  citation: string;
  sourceType: "url" | "db" | "file";
  checksum: string;
  verifier?: string;
}
interface GovernedException {
  id: string;
  taskId: string;
  policyRef: string;
  approver: string;
  justification: string;
  createdAt: string;
}
interface TraceSpan {
  stepId: string;
  tool?: string;
  start: number;
  end: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  status: "ok" | "error";
}
```

## 4) Backlog: Epics → Issues (prioritized)

### Epic 1: Agentic Runtimes (Planner/Executor/Reviewer)

- Objective: Stand up archetype-tuned runtimes with audit-ready gates.
- Non-goals: UI revamp; new data sources.
- Acceptance: Runtimes for RAG, research, coding with reviewer hooks; policies enforced; traces captured.
- Risks: Model drift; policy gaps.
  - Issue: Implement runtime skeleton with planner/executor/reviewer modules. Rationale: baseline orchestration. Files: `server/src/agents/`, `packages/agent-runtime/`. Tests: unit for planner transitions. Telemetry: trace spans per step.
  - Issue: Add human-in-loop gate config per risk tier. Rationale: controlled rollout. Files: `server/src/policy/`, `server/src/agents/hooks`. Tests: policy evaluation cases. Telemetry: approval events.
  - Issue: Tool Gateway adapter for MCP/A2A schemas. Rationale: protocol interoperability. Files: `packages/tool-gateway/`. Tests: schema validation. Telemetry: tool call errors.
  - Issue: Citation ledger service. Rationale: trustworthy outputs. Files: `packages/provenance-ledger/`. Tests: append/read integrity. Telemetry: missing citation alerts.
  - Issue: Event log append-only sink. Rationale: auditability. Files: `packages/event-log/`. Tests: immutability checks. Telemetry: write failures.
  - Issue: Governed exception ledger (policy override tracking). Rationale: audited deviations. Files: `packages/provenance-ledger/`. Tests: append-only + approval checks. Telemetry: exception frequency.

### Epic 2: Research Agent (DeepResearch)

- Objective: Iterative search-summarize-verify pipeline with citations.
- Non-goals: New UI widgets.
- Acceptance: Research agent completes tasks with ≥90% citation coverage metric.
- Risks: Source quality, latency.
  - Issue: Search tool integration with retry/backoff. Files: `server/src/connectors/search`. Tests: mocked search flow. Telemetry: search latency/errors.
  - Issue: Summarizer with evidence bundling. Files: `packages/research-agent/summary`. Tests: citation linking. Telemetry: summary token/cost.
  - Issue: Verifier that cross-checks claims vs sources. Files: `packages/research-agent/verify`. Tests: contradiction detection. Telemetry: verification pass rate.
  - Issue: Planner scoring to iterate until coverage threshold. Files: `packages/research-agent/planner`. Tests: loop termination cases. Telemetry: iteration count.
  - Issue: Graph/Vector memory writes with retention. Files: `server/src/memory`. Tests: retention enforcement. Telemetry: write throughput.

### Epic 3: Tool Gateway & Protocol Security

- Objective: Unified tool registry with policy-aware execution.
- Non-goals: Tool marketplace UI.
- Acceptance: Tools registered with schemas, scopes; OPA enforced; quotas applied.
- Risks: Over-permissioning, latency.
  - Issue: Tool manifest schema + registry service. Files: `packages/tool-gateway/registry`. Tests: schema validation. Telemetry: registration events.
  - Issue: Scope-aware invocation middleware. Files: `packages/tool-gateway/runtime`. Tests: denied scope cases. Telemetry: denial counts.
  - Issue: Quota and budget enforcement per tenant/tool. Files: `packages/tool-gateway/limits`. Tests: quota exhaustion. Telemetry: budget usage.
  - Issue: Prompt firewall for tool inputs. Files: `packages/tool-gateway/security`. Tests: injection patterns. Telemetry: blocked attempts.
  - Issue: Cross-agent call provenance stamping. Files: `packages/tool-gateway/provenance`. Tests: signature verification. Telemetry: cross-agent call metrics.

### Epic 4: Coding & CUA Safety

- Objective: Safe automation for coding agents and computer-using agents.
- Non-goals: IDE UX polish.
- Acceptance: Coding agent applies diffs only after tests/policy; CUA runs in sandbox with logs.
- Risks: Sandbox escape, repo corruption.
  - Issue: Dry-run diff planner + reviewer approval. Files: `packages/dev-agent/`. Tests: diff approval flow. Telemetry: approvals vs rejects.
  - Issue: OPA/semgrep policy gate before apply. Files: `packages/dev-agent/policy`. Tests: policy fail cases. Telemetry: policy violation counts.
  - Issue: Test harness runner with artifact capture. Files: `packages/dev-agent/tests`. Tests: run harness; record evidence. Telemetry: test durations.
  - Issue: CUA sandbox harness with network/clipboard isolation. Files: `packages/cua-sandbox/`. Tests: isolation unit/e2e. Telemetry: blocked operations.
  - Issue: Replayable trace export (DOM snapshots). Files: `packages/cua-sandbox/trace`. Tests: trace serialization. Telemetry: snapshot sizes.

### Epic 5: Observability & ROI

- Objective: Full-fidelity traces, metrics, and ROI dashboard.
- Non-goals: External billing integration.
- Acceptance: Dashboard shows success rate, cost/task, latency, citation precision per archetype.
- Risks: Metrics drift, PII in logs.
  - Issue: OpenTelemetry spans across planner/executor/tools. Files: `packages/telemetry/`. Tests: span linkage. Telemetry: trace completeness metric.
  - Issue: Cost meter per step/token. Files: `packages/telemetry/cost`. Tests: cost calculation. Telemetry: cost overage alerts.
  - Issue: Quality signals (citation precision proxy). Files: `packages/telemetry/quality`. Tests: precision calculation. Telemetry: quality trend.
  - Issue: ROI dashboard widgets. Files: `web/src/pages/analytics`. Tests: component rendering. Telemetry: widget load errors.
  - Issue: Alerting rules (p95 latency, tool error rate). Files: `observability/config`. Tests: config validation. Telemetry: alert fire counts.

## 5) Guardrails Pack (Responsible Autonomy)

- Tool permission model
  - Control: Scopes + allowlists per tool/tenant, approval for high-risk scopes.
  - Implement: Tool registry with scopes; OPA policy evaluating task risk; approval workflow.
  - Test: Unit tests for denied/approved calls; integration simulating cross-tenant requests.
- Data handling
  - Control: PII tagging, tenant boundary enforcement, redaction before storage/export.
  - Implement: Memory writes carry piiTags; redaction middleware; tenancy filters in queries.
  - Test: Ensure cross-tenant queries fail; snapshot redaction validation.
- Prompt injection & exfil prevention
  - Control: Prompt firewall patterns, content safety filters, output allowlist.
  - Implement: Middleware scanning inputs/outputs; blocklist/allowlist rules; escape-check on tool args.
  - Test: Injection corpus tests; exfil attempt simulation.
- Memory leakage controls
  - Control: Retention policies per tier; purge jobs; scoped retrieval.
  - Implement: TTL on scratch; retention scheduler; query filters by task/tenant.
  - Test: Expiry tests; access denial after purge.
- Self-modification limits (coding agents)
  - Control: No self-applying without human approval; diff size/time budgets.
  - Implement: Approval gate, policy on files touched, rollback plan requirement.
  - Test: Attempt auto-apply -> blocked; large diff -> rejected.
- Governed exception handling
  - Control: All policy overrides must be recorded, approved, and time-boxed.
  - Implement: Governed exception ledger with approver identity + expiry; automatic revocation.
  - Test: Override without approval rejected; expired override invalidated.
- CUA sandbox policy
  - Control: Isolated browser/VM, domain/network allowlist, clipboard/file I/O restrictions.
  - Implement: Launch sandbox with seccomp/AppArmor (or container), proxy enforcing domains, blocked clipboard.
  - Test: Network to disallowed domain fails; clipboard blocked; file writes constrained.

## 6) KPI & ROI Instrumentation Spec

- Agent success rate: % tasks reaching DONE without manual retry. Collect from orchestrator events. Dashboard: line + per-archetype bar. SLO: 95%.
- Task latency (p50/p95): Time from accept → done. Collect traces. Dashboard: percentile charts. SLO: p95 < 30s (RAG), <90s (CUA).
- Citation precision proxy: Verified citations / total claims. Collect from verifier outputs. Dashboard: stacked bar. SLO: ≥0.9 for research/RAG.
- Hallucination rate proxy: Claims without evidence per task. Collect from reviewer verdicts. Dashboard: heatmap by archetype. SLO: <5%.
- Tool error rate: Failed tool calls / total. Collect from gateway. Dashboard: sparkline + top offenders. SLO: <2%.
- p95 step latency: Per tool/archetype. Collect from spans. Dashboard: table with thresholds. SLO: configurable budgets.
- Cost per task: Tokens + tool costs converted to USD. Collect from cost meter. Dashboard: trend + budget burn. SLO: stay within monthly budget.
- Human intervention rate: Tasks requiring manual approval/rework. Collect from approval workflow. Dashboard: funnel. SLO: <15% for mature archetypes.
- Governed exception rate: Policy overrides per 100 tasks. Collect from exception ledger. Dashboard: trend + top policies. SLO: <1% without explicit justification.

## 7) Governance-Ready Delivery Checklist (MVP → GA)

- **Policy-as-code coverage:** All control points enforced via OPA policies, no ad-hoc checks.
- **Evidence capture:** Every tool call has evidence + checksum entries in the citation ledger.
- **HITL enforcement:** High-risk tasks always require human approval; no autonomous bypass.
- **Governed exceptions:** All overrides time-boxed, approved, and audited.
- **Memory hygiene:** TTLs and redaction policies verified per tier; no cross-tenant leakage.
- **Observability parity:** Traces, cost, and quality metrics exported to the standard OTel pipeline.

## 8) “Do Next” PR Plan (atomic PRs)

1. Add agent runtime skeleton (planner/executor/reviewer) — files: `server/src/agents/`, new `packages/agent-runtime`; tests: unit transitions.
2. Introduce Tool Gateway registry and MCP/A2A adapter — files: `packages/tool-gateway/`; tests: schema and protocol adapter.
3. Create citation ledger service + evidence object schema — files: `packages/provenance-ledger/`; tests: append/read integrity.
4. Wire human-in-loop gates with OPA policies — files: `server/src/policy/`, `packages/agent-runtime/hooks`; tests: policy evaluation.
5. Implement research agent loop with verification — files: `packages/research-agent/`; tests: search/summarize/verify loop.
6. Add coding agent diff planner + policy/test gates — files: `packages/dev-agent/`; tests: diff gating + harness run.
7. Build CUA sandbox wrapper with trace export — files: `packages/cua-sandbox/`; tests: isolation + trace serialization.
8. Instrument OpenTelemetry spans and cost meter — files: `packages/telemetry/`, `server/src/agents`; tests: span linkage.
9. Add ROI dashboard widgets — files: `web/src/pages/analytics`; tests: component rendering.
10. Configure alerting for latency/tool errors — files: `observability/config`; tests: config validation.
