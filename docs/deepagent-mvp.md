# DeepAgent-Style MVP Deliverable for IntelGraph

## Conductor Summary

### Goal
Ship a minimal, IntelGraph-compatible "DeepAgent-style" service that keeps thinking, tool discovery, and tool execution in a single reasoning loop, adds memory folding (episodic, working, and tool memories), and logs provenance behind the GraphQL gateway and organizational guardrails. The deliverable must align with the paper's core ideas of dynamic tool retrieval, memory folding, and an end-to-end loop.

### Non-Goals
- Reproducing ToolPO reinforcement learning training or the benchmarking suite at this stage.
- Anything outside the MVP surface described below, though hooks for future enhancements should be designed.

### Constraints
- Honor IntelGraph defaults: SLOs, ABAC/OPA, provenance, and cost guardrails.
- Technical stack: Node.js 20 with TypeScript, Apollo GraphQL, PostgreSQL, Neo4j, OpenTelemetry.
- Provide deterministic testability.

### Risks & Mitigations
- **Tool sprawl** → enforce allow/deny-lists and guardrails.
- **Prompt injection via tool manifests** → validate manifests with OPA and sanitization.
- **Context bloat** → implement folding thresholds and redaction routines.

### Definition of Done
- Running service with GraphQL API and Socket.IO streaming.
- Dynamic tool registry and retriever service.
- Single-loop agent integrating reasoning, tool discovery, and execution with memory folding.
- Provenance ledger and OpenTelemetry instrumentation.
- Automated tests, k6 smoke script, Docker Compose environment, Helm chart stub, CI pipeline, and acceptance pack.

### Key References
- MarkTechPost DeepAgent coverage (2025-11-01).
- DeepAgent arXiv publication.
- Official DeepAgent GitHub repository.

## Fully-Formed Prompt for Codex

```
You are a senior TypeScript platform engineer. Generate a production-ready DeepAgent-style MVP for IntelGraph that unifies autonomous thinking → tool discovery → tool execution in one reasoning loop, implements memory folding (episodic/working/tool), and enforces OPA/ABAC, provenance, observability, and IntelGraph SLOs. Deliver runnable code, tests, Docker/Helm, and CI in one pass.

Tech stack & structure
- Language: TypeScript (ES2022), Node 20.
- APIs: Apollo GraphQL (Gateway-friendly), subscriptions via Socket.IO for live tokens/events.
- Data: PostgreSQL (provenance + memory + tools), Neo4j (graph ops examples).
- Policy: OPA (rego) via open-policy-agent/opa-wasm.
- Observability: OpenTelemetry (traces/metrics), structured JSON logs.
- Container/IaC: Dockerfile, docker-compose.yaml (includes Postgres, Neo4j, the service, a mock “tool server”), Helm chart (values for SaaS multi-tenant vs. ST-DED).
- Tests: Jest (unit/integration), k6 (latency SLO smoke), Playwright (optional e2e against GraphQL).
- Lint/Sec: ESLint + Prettier, dependency scanning & SBOM (e.g., cyclonedx-npm), secret scanning.

Create this repo layout:

deepagent-mvp/
  package.json
  tsconfig.json
  docker-compose.yaml
  Dockerfile
  helm/Chart.yaml
  helm/values.yaml
  src/
    index.ts
    config.ts
    server/http.ts
    server/graphql/schema.graphql
    server/graphql/resolvers.ts
    server/realtime/socket.ts
    agent/loop.ts
    agent/policies/opa.rego
    agent/memory/folding.ts
    agent/memory/store.ts
    agent/memory/schemas.ts
    agent/reasoning/llm.ts
    agent/reasoning/planner.ts
    tools/registry.ts
    tools/retriever.ts
    tools/executor.ts
    tools/schemas.ts
    provenance/ledger.ts
    observability/otel.ts
    db/migrations/*.sql
  mocks/tool-server/ (Express app exposing 3 mock tools)
  tests/unit/*.test.ts
  tests/integration/*.test.ts
  tests/k6/script.js
  .github/workflows/ci.yml
  README.md

Core features (implement fully)
1. Single reasoning loop (agent/loop.ts):
   - Accepts {tenantId, actor, task, goalHints?, toolFilters?} and a Toolset API handle.
   - On each step, call planner.decide() to produce a compact action JSON:

     type AgentAction =
       | {type: 'search_tools'; query: string}
       | {type: 'call_tool'; toolId: string; name: string; params: Record<string, any>}
       | {type: 'fold_memory'; reason: string}
       | {type: 'finish'; answer: string; evidence: string[]};

   - Never emit chain-of-thought to clients. Keep internal scratchpad private. Stream only actions, tool I/O, and final answer over Socket.IO and GraphQL subscription resolvers.

2. Tool registry + discovery:
   - tools/registry.ts: Postgres tables tools(id, name, description, openapi, auth, tags text[], enabled bool, owner, created_at).
   - tools/retriever.ts: Simple retrieval that ranks tools by BM25-like scoring over name/description/tags; support filter by tags/tenant allowlist; return top-k.
   - tools/executor.ts: Execute REST tools from stored OpenAPI/JSON schema (no codegen—generic HTTP executor). Add allow/deny-list and OPA check: (actor, tenant, toolId, params) -> allow/deny.
   - Include three mock tools served by mocks/tool-server: searchCatalog, lookupUser, createTicket. Use them in tests to avoid internet calls.

3. Memory folding:
   - Data model (agent/memory/schemas.ts):
     - episodic_memory(run_id, step, event_json, ts)
     - working_memory(run_id, summary, key_facts jsonb, ts)
     - tool_memory(run_id, tool_id, usage_stats jsonb, last_result jsonb, ts)
   - folding.ts: Implement a budget-aware fold:
     - Trigger when token/step budget exceeded or planner requests it.
     - Produce working_memory.summary (compact bullets) and key_facts (machine-readable).
     - Prune episodic history older than last fold but keep hash anchors for provenance.
   - store.ts: Postgres CRUD with retention tiers (standard-365d default; PII tables use short-30d), plus purge routines.
   - reasoning/llm.ts: Abstraction generate({system, prompt, stop, maxTokens}). Provide a mock local heuristic fallback so tests pass without external LLMs; code should be ready to inject a real provider.

4. Provenance ledger:
   - Append-only table provenance_events(id, run_id, actor, type, payload jsonb, ts, prev_hash, hash).
   - ledger.ts: Compute SHA-256 over (prev_hash || '') + canonical_json(payload).
   - Log: run start, tool retrieval sets, tool calls (request/response), memory folds (before/after digests), final answer.
   - Export endpoint to emit a signed NDJSON manifest with hashes.

5. Security/Policy:
   - OPA rego (agent/policies/opa.rego) enforcing:
     - ABAC: tenant boundary, actor role, tool allowlist.
     - Purpose tag required on run (investigation|threat-intel|…) → affects retention tier.
     - Deny tools marked restricted unless justification present.
   - mTLS stubs and JWT validation middleware; redact secrets in logs; field-level encryption helper for sensitive params.

6. GraphQL API:
   - SDL:

     type AgentRun { id: ID!, status: String!, events: [AgentEvent!]! }
     type AgentEvent { ts: String!, type: String!, data: JSON! }
     type Query { run(id: ID!): AgentRun }
     type Mutation {
       startRun(input: StartRunInput!): AgentRun!
       registerTool(input: RegisterToolInput!): Tool!
     }
     type Subscription { runEvents(runId: ID!): AgentEvent! }

   - Implement resolvers with backpressure (bounded event buffer) and p95/p99 latency metrics.

7. Observability & SLOs:
   - OTel traces around each loop step and tool call; Prometheus metrics:
     - graphql_request_latency_ms (p95 ≤ 350ms queries / ≤ 700ms mutations).
     - tool_call_latency_ms, memory_fold_count, policy_denies_total.
   - Readiness/liveness endpoints; budget alerts (emit warning when error budget < 50%).

8. Testing & CI:
   - Jest unit tests (planner decisions, retriever ranking, executor happy/deny paths, folding correctness).
   - Integration test: start mocks + DB, run a task that requires search→call→fold→call→finish; assert provenance chain continuity and policy checks.
   - k6 script driving startRun and runEvents to verify latency SLOs under light load.
   - GitHub Actions: install, lint, build, unit/integration, k6 smoke, SBOM, artifact upload.

Implementation details & guardrails
- Keep all scratchpad/CoT internal—never expose in API responses or logs. Output only actions, tool I/O summaries, and final answers.
- Sanitization: neutralize tool-returned HTML/JS; JSON schema validation on tool params/results.
- Tenancy: every DB row keyed by tenant_id; add OPA check on every tool exec and run start.
- Cost switches: config gate to disable external LLMs by default; mock provider in tests.

Provide
- All code files with comments.
- SQL migrations for Postgres (including pgcrypto for hashing if used).
- Sample data: insert three mock tools.
- README.md with quickstart:
  - docker compose up -d
  - npm run dev  → GraphQL at :8080/graphql, Socket.IO at :8080/rt.
  - Example mutation & subscription.
- Mermaid architecture diagram in README linking: Client ↔ GraphQL/Socket.IO ↔ Agent Loop ↔ Tool Retriever/Executor ↔ OPA ↔ Postgres/Neo4j ↔ OTel.
- Helm values for SaaS vs ST-DED (separate namespace and data plane).

Acceptance criteria (auto-verify in tests)
- A demo run uses two different tools, performs ≥1 memory fold, and finishes with a final answer and an exportable provenance manifest.
- Policy denies an unauthorized tool call and logs structured reason.
- k6 shows GraphQL query p95 ≤ 350ms and mutation p95 ≤ 700ms at 20 RPS (local).
- No CoT text leaked in any API/log output.

Stretch (scaffold only, behind feature flags)
- Hook for RL/ToolPO-like credit assignment (interface only).
- MCP compatibility shim for future external tool catalogs.
```

## Optional Add-On
- Offer to supply a slim agent system prompt that reinforces the single loop, private scratchpad, and memory folding requirements when integrating an external LLM.

## Usage Notes
- Paste the Codex prompt into the IntelGraph code generation workflow to scaffold the MVP repository.
- Align implementation decisions with IntelGraph Engineering Standard v4 and existing OPA guardrails.
