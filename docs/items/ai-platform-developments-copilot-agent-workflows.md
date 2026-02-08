# ITEM: AI platform developments — copilot + agent workflows (MCP-centric)

**Mode**: Sensing → Reasoning (evidence-first; analysis follows).

**Summit Readiness Assertion**: See `docs/SUMMIT_READINESS_ASSERTION.md` for the governing readiness posture.

## 0.1 UEF Evidence Bundle (Sensing)

**Sources (verbatim URLs)**

- Amazon Ads opens Advertising APIs to AI agents via MCP (MCP server open beta). Source: PPC Land. https://ppc.land/amazon-opens-its-advertising-apis-to-ai-agents-through-industry-protocol/
- GitHub adds Claude + Codex agents alongside Copilot across issue/PR workflows. Source: The Verge. https://www.theverge.com/news/873665/github-claude-codex-ai-agents
- Xcode 26.3 adds agent-level capabilities + MCP support integrating OpenAI/Anthropic. Source: The Verge. https://www.theverge.com/news/873300/apple-xcode-openai-anthropic-ai-agentic-coding
- OpenAI Frontier launches for “AI co-workers” (enterprise agent orchestration/governance positioning). Source: WSJ. https://www.wsj.com/articles/openai-unveils-frontier-a-product-for-building-ai-co-workers-a013784c
- Context engineering replaces prompt engineering as production-critical discipline. Source: Medium. https://tao-hpu.medium.com/context-engineering-is-replacing-prompt-engineering-for-production-ai-02205fad2a7f
- MCP misconceptions (MCP is not “just an API”). Source: Docker. https://www.docker.com/blog/mcp-misconceptions-tools-agents-not-api/
- MCP protocol security weaknesses (capability attestation gaps, injection vectors). Source: arXiv. https://arxiv.org/abs/2601.17549
- MCP “Apps” interactive outputs in VS Code (tool calls returning richer UI components). Source: VS Code blog. https://code.visualstudio.com/blogs/2026/01/26/mcp-apps-support
- Microsoft agent ecosystem patterns (Copilot SDK + Agent Framework). Source: MS DevBlogs. https://devblogs.microsoft.com/semantic-kernel/build-ai-agents-with-github-copilot-sdk-and-microsoft-agent-framework/

## 0.2 Evidence Tags (Sensing)

- **UEF:CLAIM-01** — Amazon Ads opens Advertising APIs to AI agents via MCP server open beta.
- **UEF:CLAIM-02** — GitHub integrates Claude and Codex agents alongside Copilot for issue/PR workflows.
- **UEF:CLAIM-03** — Xcode 26.3 adds MCP support with agentic coding integrations.
- **UEF:CLAIM-04** — OpenAI Frontier positions enterprise “AI co-workers” orchestration/governance.
- **UEF:CLAIM-05** — Context engineering replaces prompt engineering as production-critical discipline.
- **UEF:CLAIM-06** — MCP misconceptions: treating MCP as API leads to fragile systems.
- **UEF:CLAIM-07** — MCP protocol weaknesses: capability attestation gaps and injection vectors.
- **UEF:CLAIM-08** — VS Code MCP Apps enables interactive UI output payloads.
- **UEF:CLAIM-09** — Microsoft agent ecosystem patterns via Copilot SDK + Agent Framework.

---

## 1.0 ITEM ingest (what changed, with grounded pointers)

Input ITEM = today’s “AI platform developments” summary focused on copilot + agent workflows.

- Amazon Ads opens Advertising APIs to AI agents via MCP (MCP server open beta). (UEF:CLAIM-01)
- GitHub adds Claude + Codex agents alongside Copilot across issue/PR workflows. (UEF:CLAIM-02)
- Xcode 26.3 adds agent-level capabilities + MCP support integrating OpenAI/Anthropic. (UEF:CLAIM-03)
- OpenAI Frontier launches for “AI co-workers” (enterprise agent orchestration/governance positioning). (UEF:CLAIM-04)
- Context engineering replaces prompt engineering as production-critical discipline. (UEF:CLAIM-05)
- MCP misconceptions (treating MCP as an API layer causes fragile systems). (UEF:CLAIM-06)
- MCP protocol security weaknesses (capability attestation gaps, injection vectors). (UEF:CLAIM-07)
- MCP “Apps” interactive outputs in VS Code. (UEF:CLAIM-08)
- Microsoft agent ecosystem patterns (Copilot SDK + Agent Framework). (UEF:CLAIM-09)

---

## 1.1 Summit context assumptions (explicit)

1. **ASSUMPTION:** Summit has a central agent runtime / orchestrator where tool integrations can be standardized (or can be added).
   - **Validation plan:** repo scan for `agent`, `orchestrator`, `tool`, `connector`, `function calling`, existing policy/approval hooks; identify a single tool execution boundary to enforce governance.
2. **ASSUMPTION:** Summit can ship an MCP client and/or MCP gateway in a multi-tenant environment.
   - **Validation plan:** confirm language/runtime (Node/Python/Go), deployment (K8s/serverless), tenant isolation model, and secret-management service.
3. **ASSUMPTION:** Summit requires GA-grade evidence: deterministic eval harnesses, reproducible artifacts, security docs, and CI gates.
   - **Validation plan:** inventory CI pipelines, artifact store conventions, and compliance requirements (SOC2/ISO/etc.), then map evidence IDs to existing build metadata.

---

## 1.2 Extracted verifiable claims (from ITEM sources only)

### MCP adoption & tooling

- Amazon Ads is opening advertising API access to AI agents through MCP. (UEF:CLAIM-01)
- VS Code enables MCP Apps: tool calls can return interactive UI components, not only text. (UEF:CLAIM-08)
- Xcode 26.3 adds MCP support alongside agentic coding integrations. (UEF:CLAIM-03)

### Multi-agent ecosystems / vendor mixing

- GitHub integrates Claude and Codex agents in addition to Copilot, implying agent choice and multi-agent workflows in GitHub surfaces. (UEF:CLAIM-02)
- Microsoft publishes patterns to build agents with GitHub Copilot SDK and Microsoft Agent Framework. (UEF:CLAIM-09)

### Context engineering shift

- Context engineering emphasizes dynamic, structured curation of what enters model context beyond prompt text. (UEF:CLAIM-05)

### MCP security

- Research reports MCP protocol-level weaknesses (capability attestation gaps, injection vectors). (UEF:CLAIM-07)
- Docker argues MCP is often misunderstood as “just an API,” leading to incorrect architectures. (UEF:CLAIM-06)

### Enterprise “AI coworker” governance category

- OpenAI Frontier is positioned as a platform for building “AI co-workers,” signaling enterprise orchestration + governance category pressure. (UEF:CLAIM-04)

---

## 1.3 Triage & relevance scoring (0–5)

- **MCP as integration fabric (Amazon + VS Code MCP Apps + Xcode MCP): 5**
- **MCP security research: 5**
- **Multi-agent ecosystems (GitHub + MS Agent Framework patterns): 4**
- **Context engineering shift: 4**
- **Frontier category pressure: 3**

---

## 1.4 Compatibility & integration risk register (concrete)

**R1 — MCP capability/permission ambiguity**

- **Risk:** insufficient capability attestation → tool overreach / spoofing. (UEF:CLAIM-07)
- **Summit control:** deny-by-default capability manifests + signed server identity + per-tenant allowlists.

**R2 — Prompt injection through tool channels**

- **Risk:** tool outputs / remote servers can inject instructions, causing unsafe tool execution. (UEF:CLAIM-07)
- **Summit control:** instruction firewall + provenance/taint tags + mandatory approval for sensitive actions.

**R3 — Treating MCP as “just another API connector”**

- **Risk:** fragile orchestration, poor observability, nondeterministic workflows. (UEF:CLAIM-06)
- **Summit control:** workflow tools contract (plan/validate/execute/verify) enforced in CI.

**R4 — Interactive UI outputs expand the attack surface**

- **Risk:** MCP Apps-style UI payloads can become injection vectors (malicious UI schemas, confusing approvals). (UEF:CLAIM-08)
- **Summit control:** strict UI schema allowlists; no arbitrary HTML; signed approval grants with expiry.

**R5 — Vendor agent ecosystems create coupling**

- **Risk:** GitHub/Xcode-first flows may bypass Summit governance if Summit isn’t the policy boundary. (UEF:CLAIM-02, UEF:CLAIM-03)
- **Summit control:** Summit as gateway-of-record for tool execution; adapters bring external sessions into Summit policy.

---

## 1.5 Disposition (exactly one)

**DISPOSITION: INTEGRATE**

Summit integrates MCP-first interoperability with a Summit-controlled security/governance boundary and a context-engineering layer, while maintaining vendor-neutral, multi-agent orchestration.

---

## 1.6 Integration strategy (build vs interop)

### Build (Summit differentiators)

1. **Secure MCP Gateway**: tenant isolation, capability manifests, provenance/taint, approvals, signing, fixture replay.
2. **Context Engineering Layer**: budgeted context assembly + versioned context graphs + redaction policies. (UEF:CLAIM-05)
3. **Workflow-tools SDK**: enforce deterministic tool semantics (plan/validate/execute/verify) to avoid MCP-as-API trap. (UEF:CLAIM-06)
4. **Interactive Agent UI runtime** compatible with Apps-style outputs (schema-driven, sandboxed). (UEF:CLAIM-08)

### Interop (ecosystem leverage)

- Treat Amazon Ads MCP server, IDE MCP support, and other external MCP servers as untrusted endpoints reachable only via Summit gateway policy. (UEF:CLAIM-01, UEF:CLAIM-03)
- Add adapters for GitHub/Microsoft agent frameworks to import/export sessions and preserve governance. (UEF:CLAIM-02, UEF:CLAIM-09)

---

## 1.7 PR stack (PR-ready: code + CI gates + evals + regression + evidence)

> Repo paths are Summit-standard placeholders until 1.1 validation maps them.

### PR-1 — `mcp-gateway` (policy boundary)

**Purpose:** MCP traffic proxy enforcing Summit governance.

- **Code**
  - `packages/mcp-gateway/src/gateway.{ts,py}`
  - `packages/mcp-gateway/src/policy/`
    - `capabilities.allowlist.yaml` (per server + per tenant)
    - `approval.matrix.yaml` (what requires human approval)
  - `packages/mcp-gateway/src/provenance/tags.ts` (origin, server_id, tool_id, tenant_id, hash)
  - `packages/mcp-gateway/src/security/signing.ts` (manifest + message signing)
- **CI gate**
  - `.github/workflows/mcp-gateway-ci.yml` (unit tests + dependency scan + policy lint)
- **Security eval + regression**
  - `evals/mcp_security/cases.yaml` (capability spoof, injection, chain propagation)
  - `tests/regression/test_mcp_policy_enforcement.*`
- **Deterministic evidence artifacts**
  - `artifacts/evidence/EVID-mcp-gw-2026-0001/{report,metrics,stamp}.json`

### PR-2 — `context-engine` (context assembly compiler)

**Purpose:** Replace prompt-only behavior with structured context engineering.

- **Code**
  - `packages/context-engine/src/assembler.ts`
  - `packages/context-engine/src/budgeter.ts` (token budgets)
  - `packages/context-engine/src/graph/context_graph.ts` (versioned nodes)
  - `packages/context-engine/src/redaction/pii.ts`
- **CI gate**
  - `.github/workflows/context-determinism.yml` (determinism test: same inputs → identical `context_hash`)
- **Evals + regression**
  - `evals/context/assembly_quality.yaml` (waste %, relevance %, hallucination-proxy via tool mismatch)
  - `tests/regression/test_context_hash_stability.*`
- **Evidence**
  - `artifacts/evidence/EVID-ctx-2026-0001/{report,metrics,stamp}.json`
  - `artifacts/evidence/EVID-ctx-2026-0001/context_graph.json`

### PR-3 — `mcp-toolkit` (workflow tools contract)

**Purpose:** Enforce “tools are workflows” and avoid MCP-as-API pitfalls.

- **Code**
  - `packages/mcp-toolkit/src/workflow_tool.ts` (plan/validate/execute/verify)
  - `packages/mcp-toolkit/src/contracts/tool_contract.schema.json`
  - `templates/mcp-workflow-tool/`
- **CI gate**
  - `.github/workflows/tool-contracts.yml` (fails if new tool lacks schemas/side-effect declaration/verification/rollback)
- **Regression + evidence**
  - `tests/regression/test_tool_contract_gate.*`
  - `artifacts/evidence/EVID-tools-2026-0001/*`

### PR-4 — `interactive-agents` (Apps-style UI output sandbox)

**Purpose:** Render interactive agent outputs safely (forms, approvals, dashboards).

- **Code**
  - `packages/agent-ui/src/renderers/mcp_apps_renderer.tsx`
  - `packages/agent-ui/src/schemas/ui_allowlist.json`
  - `packages/agent-ui/src/security/no_html_guard.ts`
- **CI gate**
  - `.github/workflows/ui-schema-security.yml` (blocks unsafe schema patterns; snapshot tests)
- **Evidence**
  - `artifacts/evidence/EVID-ui-2026-0001/*`

### PR-5 — `ecosystem-adapters` (GitHub / IDE / Agent Framework bridges)

**Purpose:** Bring external ecosystems into Summit governance boundary.

- **Code**
  - `packages/adapters/github-agent/` (session import/export; issue/PR linkage)
  - `packages/adapters/ide-mcp/` (Xcode/VS Code MCP connectivity patterns)
  - `packages/adapters/ms-agent-framework/` (interop patterns)
- **CI gate**
  - Contract tests with recorded fixtures only (no live vendor calls)
- **Evidence**
  - `artifacts/evidence/EVID-adapters-2026-0001/*`

---

## 1.8 Governance, security, compliance (GA defaults)

- **Policy boundary:** all tool execution goes through `mcp-gateway` (even if IDE/GitHub initiates).
- **Capability governance:** signed server manifests + per-tenant allowlists. (UEF:CLAIM-07)
- **Instruction firewall:** tool outputs treated as untrusted; separated from system instructions; taint tags applied. (UEF:CLAIM-07)
- **Approvals:** signed Approval Grants required for destructive actions, credential access, billing/finance, cross-system writes.
- **Auditability:** append-only event log + deterministic evidence artifacts per CI run.

---

## 1.9 Evaluation plan (measurable + reproducible)

### Security evals (MCP-specific)

- Suite derived from MCP weakness categories: capability spoofing, injection, multi-hop trust failures. (UEF:CLAIM-07)
- Metrics:
  - `attack_success_rate`
  - `policy_block_rate`
  - `false_positive_rate`

### Reliability evals (context engineering)

- Metrics:
  - `context_hash_stability = 100%`
  - `token_waste_pct`
  - `tool_selection_accuracy`

### UX evals (interactive outputs)

- Metrics:
  - `unsafe_schema_rejection_rate`
  - `approval_confusion_rate`

All evals emit `{report, metrics, stamp}.json` with stable Evidence IDs.

---

## 1.10 Determinism & offline/air-gapped operation

- **Fixture replay mode** in gateway + adapters (recorded MCP transcripts signed and replayed in CI/offline).
- **Versioned context graphs** allow exact replay of agent steps.
- **Pinned dependencies + SBOM** for each package artifact.

---

## 1.11 Supply-chain, license, contamination avoidance

- Clean-room implementations for MCP gateway/toolkit; do not copy vendor SDK internal logic.
- SBOM output per build: `artifacts/sbom/<package>.spdx.json`.
- Dependency policy gate in CI (license allowlist + vuln threshold).

---

## 1.12 Innovation & obsolescence (surpass ITEM)

### 3 features impractical for ITEM creators but feasible for Summit

1. **Cross-server taint firewall + policy proofs** (machine-verifiable “why allowed” per hop)
   - First PR: extend PR-1 provenance + add `policy_proof` to evidence.
2. **Residency-aware context compiler** (context partitions by region/tenant; prevents cross-boundary memory bleed)
   - First PR: PR-2 add `residency_partition_id` + determinism tests.
3. **Cryptographic approval grants** (interactive UI approvals become signed, expiring capabilities)
   - First PR: PR-4 schema + PR-1 signing service.

### 2 architectural leaps

1. **MCP mesh gateway** (service-mesh-like enforcement + tracing for all MCP traffic)
   - First PR: PR-1 + OTel in PR-3.
2. **Context-as-artifact** (every step produces a versioned, replayable context graph)
   - First PR: PR-2 `context_graph.json` emission + hash.

### 1 workflow redesign

- **Tool-first development**: engineers ship deterministic workflow tools; models only parameterize/sequence them (avoid MCP-as-API failure mode). (UEF:CLAIM-06)

### 1 new benchmark ITEM doesn’t measure

- **MCP Cross-Server Compromise Amplification Benchmark (MCP-CSCAB)**
  - Measures how much a compromised server/tool amplifies unauthorized actions across chained servers (maps to MCP weakness categories). (UEF:CLAIM-07)

---

## 1.13 Go/No-Go gates (explicit)

**GO** only if:

- MCP security suite shows ≥80% reduction in attack success vs baseline.
- Context determinism: 100% hash stability in CI replay mode.
- All write/destructive/credential/billing operations require signed Approval Grants.
- Multi-tenant isolation tests pass (no cross-tenant context/tool leakage).

**NO-GO** if:

- Any MCP server enabled without signed manifest + allowlist entry.
- Any UI schema renderer accepts arbitrary HTML or unbounded markdown.
- Any adapter relies on live external calls in CI (fixtures only).

---

## 1.14 PR-ready next steps (immediate)

1. Land PR-1 skeleton: gateway proxy + deny-by-default policy + signed manifests + evidence output.
2. Add MCP security eval harness seeded with arXiv-derived scenarios. (UEF:CLAIM-07)
3. Land PR-3 tool-contract CI gate to prevent MCP-as-API wrapper. (UEF:CLAIM-06)
4. Prototype one MCP Apps-style approval flow (UI schema allowlist + signed approval grant). (UEF:CLAIM-08)
5. Draft internal docs: `mcp-threat-model.md`, `mcp-gateway-runbook.md`, `context-engineering.md`.

---

## 1.15 Five sub-agent prompts (copy/paste)

### Architect

Design Summit’s MCP-first architecture with a Secure MCP Gateway and Context Engineering Layer. Provide module boundaries, schemas, request flows, taint/provenance rules, and how external MCP servers and IDE/GitHub sessions route through the gateway. Include file paths and PR-1..PR-5 interface contracts. Specify deterministic replay (fixtures) and context-as-artifact outputs.

### Security

Produce `docs/security/mcp-threat-model.md` for Summit. Cover capability spoofing, prompt injection via tool outputs, multi-server trust propagation, UI payload risks (MCP Apps-style), and tenant isolation. Define controls: signed manifests, allowlists, approval grants, instruction firewall, taint tracking, and CI security gates. Provide 20 concrete test cases.

### Evals

Define eval suites and harness implementation for: MCP security (per arXiv categories), context determinism (hash stability), workflow reliability (tool verification/rollback), and interactive UI safety. Specify metrics, thresholds, fixtures format, and deterministic evidence artifact schema (`report.json`, `metrics.json`, `stamp.json`) with Evidence ID conventions.

### Ops

Write `docs/ops/mcp-gateway-runbook.md`: deployment topology, autoscaling, rate limits, secrets management, tenant routing, tracing/alerting, incident response, and air-gapped fixture replay mode. Include CI/CD steps and operational SLOs for tool execution latency and policy decision latency.

### Product

Define product requirements for MCP-first agent workflows: interactive approvals, dashboards/forms, cross-system automation, and multi-agent handoffs. Specify UX schemas, safety rails, audit log UX, and differentiation vs ecosystem moves (GitHub/Xcode/Frontier category pressure). Provide a demo script and phased rollout plan.

---

## 1.16 Finality

This ITEM ingest is complete. All further changes proceed via the PR stack above.
