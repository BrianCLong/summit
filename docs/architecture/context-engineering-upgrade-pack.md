# Context Engineering Upgrade Pack (Summit/IntelGraph)

## Problem Statement

Current Summit context handling treats prompts and retrieval as loosely coupled, causing context rot (token bloat, irrelevant payloads, position bias) that harms correctness, latency, and cost. FlowHunt’s context-engineering guidance reframes the LLM as one component in a governed information ecosystem (memory, retrieval, tool registry, state, formatting). Summit needs a modular, policy-aware upgrade to write, select, compress, and isolate context with measurable safeguards.

## Principles (from FlowHunt, adapted to Summit)

- **Context engineering ≠ prompt engineering:** Optimize the full ecosystem (memory, retrieval, tool registry, policies, formatting) rather than only LLM instructions.
- **Four-strategy loop everywhere:** Write → Select → Compress → Isolate; treat as a runtime feedback loop with guardrails and measurements.
- **Context rot is real:** Larger contexts degrade quality; prioritize focused, ranked, and budgeted context assembly with decay and evaluation harnesses.
- **Hybrid selection by default:** Combine keyword/grep, vector, graph traversal, and reranking for knowledge and tool retrieval (tool-RAG).
- **Automated compression:** Trigger hierarchical, targeted summarization; summarize noisy blobs (search/logs) and keep provenance plus dropped-content notes.
- **Isolation as a primitive:** Use multi-agent separation of concerns and structured runtime state objects with field-level exposure to the LLM; sandbox heavy artifacts.
- **Measure everything:** Track correctness, provenance accuracy, token/latency/cost, and UX; log the exact context pack shown to the model for auditability.
- **Governed Exceptions, never bypasses:** Any legacy path that bypasses policy is reclassified as a governed exception with explicit owner, expiry, and rollback trigger.

## Authority Alignment (Law of Consistency)

All design artifacts align to authoritative governance files:

- **Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (absolute readiness posture).
- **Constitution + Meta-Governance:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`.
- **Agent Mandates + GA Guardrails:** `docs/governance/AGENT_MANDATES.md`, `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`.
- **Machine-readable contract:** `agent-contract.json` (OPA/ABAC, audit, and guardrail constraints).

## Proposed Architecture

```
User Msg + Session State
        ↓
[Write] Memory emitters → Memory Stores (event-log + vector + graph)
        ↓
[Select] Context Assembly Pipeline (keyword + vector + graph traversal + rerank)
        ↓                ↓                   ↓                   ↓
   Tool Registry    Knowledge Stores     Memory Store        Policy Store (OPA)
        ↓                ↓                   ↓                   ↓
        → Filtered Context Pack (budgeted sections, provenance links)
        ↓
[Compress] Auto-compact (hierarchical summaries, drop reports)
        ↓
[Isolate] Runtime State (exposed fields only) + Agent roles (planner/retriever/verifier/synthesizer)
        ↓
LLM Call → Response → Metrics/Trace → Evaluation Harness (context-rot, distractors, position bias)
```

### Component Map (governed data flow)

```
┌────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  Emitters  │→→│ Memory Event Store    │→→│ Vector + Graph Stores │
└────────────┘   └──────────────────────┘   └──────────────────────┘
        │                    │                       │
        │                    └────────────┐          │
        │                                 │          │
        ▼                                 ▼          ▼
┌──────────────────┐   ┌────────────────────────┐   ┌─────────────────┐
│ Context Assembler│←→│ Policy Guard (OPA/ABAC) │←→│ Tool Registry     │
└──────────────────┘   └────────────────────────┘   └─────────────────┘
        │
        ▼
┌──────────────────┐   ┌──────────────────────┐
│ Auto-Compactor   │→→│ Drop Reports + Summaries│
└──────────────────┘   └──────────────────────┘
        │
        ▼
┌────────────────────────────┐
│ Runtime State + Isolation  │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│ LLM + Verifier + Tracing    │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│ Provenance Ledger + Metrics │
└────────────────────────────┘
```

### Memory Taxonomy

- **Episodic:** Session transcripts, user actions, recent tool outputs.
- **Procedural:** Playbooks, tool invocation recipes, policy steps.
- **Semantic:** Knowledge graph nodes/edges, documents, embeddings, tool specs.

### Unified `MemoryItem` Schema

| Field                       | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `id`                        | Stable UUID/ULID.                                               |
| `type`                      | `episodic` \| `procedural` \| `semantic`.                       |
| `scope`                     | Tenant/org/project/session identifiers.                         |
| `created_at` / `updated_at` | Timestamps.                                                     |
| `ttl` / `decay_fn`          | Expiry or decay curve for selection scoring.                    |
| `confidence`                | 0–1 score from source quality/reviewer.                         |
| `provenance`                | Source URI, checksum, signer, policy tags.                      |
| `security_label`            | ABAC labels (e.g., `tenant:A`, `pii:low`, `export:restricted`). |
| `pii_flags`                 | Field-level PII markers.                                        |
| `embedding_ref`             | Pointer to vector index entry.                                  |
| `graph_refs`                | Node/edge IDs.                                                  |
| `content`                   | Canonical text/JSON payload (stored in event log/object store). |
| `summary`                   | Optional compacted form with pointer to dropped spans.          |

### Context Assembly Data Contracts (authoritative)

```ts
type ContextPack = {
  id: string;
  session_id: string;
  created_at: string;
  token_budget: number;
  token_actual: number;
  policy_decisions: PolicyDecisionRef[];
  sections: ContextSection[];
  provenance_refs: ProvenanceRef[];
};

type ContextSection = {
  type: "user" | "task" | "tools" | "knowledge" | "memory" | "policy";
  token_budget: number;
  token_actual: number;
  items: ContextItem[];
  selection_reason: string;
};

type ContextItem = {
  id: string;
  source_type: "memory" | "knowledge" | "tool";
  content_ref: string;
  summary_ref?: string;
  score: number;
  security_label: string;
  pii_flags: string[];
  evidence: RetrievalEvidence;
};

type RetrievalEvidence = {
  retriever: "keyword" | "vector" | "graph" | "tool-rag";
  query: string;
  filters: Record<string, string>;
  reranker: string;
  score: number;
  policy_decision_id: string;
};

type DropReport = {
  id: string;
  dropped_item_ids: string[];
  reason: string;
  token_savings: number;
  created_at: string;
};
```

### Storage Interfaces (policy-gated)

- **Event Log (append-only):** `MemoryEventStore.append(item)`; canonical source of truth with provenance.
- **Vector Store:** `VectorIndex.upsert(id, embedding_ref, security_label)`; queries require OPA/ABAC check before returning IDs.
- **Graph Store:** `GraphStore.upsert_node/edge(memory_item)`; traversal constrained by tenant/label filters from OPA.
- **Policy Gate:** `PolicyGuard.authorize(subject, action, resource)` wraps all store queries; deny on label mismatch or missing tenant context.

### Key APIs (intentionally constrained and implementation-ready)

```ts
interface MemoryWriter {
  write(item: MemoryItem, context: PolicyContext): Promise<MemoryItemRef>;
}

interface ContextAssembler {
  assemble(request: AssembleRequest, context: PolicyContext): Promise<ContextPack>;
}

interface AutoCompactor {
  compact(
    pack: ContextPack,
    budget: number
  ): Promise<{
    compacted: ContextPack;
    dropReport: DropReport;
  }>;
}

interface PolicyGuard {
  authorize(subject: Subject, action: string, resource: Resource): Promise<PolicyDecisionRef>;
}
```

### Context Assembly Pipeline

1. **Inputs:** user message, session state, declared task, active policies.
2. **Retrieve knowledge:** hybrid search (keyword/grep), vector similarity (top-k per section), graph traversal (k-hop with label filters).
3. **Retrieve tools (tool-RAG):** keyword + embedding over tool specs; include only signatures and safety notes.
4. **Retrieve memories:** rank episodic/procedural/semantic items via hybrid score = reranker(model) + decay penalty + security filter.
5. **Compose pack with token budgets:**
   - User + policy preamble (fixed 10–15% budget)
   - Task framing + instructions (10–15%)
   - Tools (5–10%)
   - Knowledge/memory (50–60%, chunked and reranked)
   - Safety/policy reminders (5–10%)
6. **Bad-retrieval defenses:**
   - Deduplicate by checksum and provenance.
   - Reject items failing policy/tenant alignment.
   - Classifier for off-topic/unsafe injection; fallback to minimal policy-safe pack.
   - Position shuffling tests in harness to detect bias.

### Policy-as-Code Compliance Rules

- All regulatory logic is expressed in OPA/Rego policies; no compliance logic is embedded in retrieval or summarization code paths.
- Every selection decision emits a policy decision reference recorded in the provenance ledger.
- Violations are build-blocking defects; adjudication is deferred pending governance review.

### Compression Strategy

- **Triggers:** on token budget >80%, on >N items, or after each tool call.
- **Methods:**
  - Hierarchical summaries (per source → per cluster → session-level).
  - Targeted summarization for log/search/tool blobs; preserve structured citations.
  - Drop reports listing excluded chunks with IDs and reasons.
- **Interfaces:** `AutoCompactor.compact(context_pack) -> (compact_pack, drop_report)` storing `summary` with provenance links.

### Isolation Strategy

- **Multi-agent roles:** planner (goal decomposition), retriever (hybrid fetch), verifier (policy/provenance), synthesizer (LLM response), sentinel (anomaly/context-rot detector).
- **Structured runtime state:**
  ```ts
  interface RuntimeState {
    session: SessionMetadata;
    selectedContext: ContextPackMetadata[]; // only IDs, titles, security labels
    exposedFields: Record<string, unknown>; // whitelisted values shown to LLM
    sandboxes: SandboxRef[]; // heavy artifacts stored externally
    policies: AppliedPolicy[];
    metrics: TokenCostEnvelope;
  }
  ```
- **Sandboxing:** store bulky artifacts (logs, attachments) in object store; provide handles + minimal extracts to LLM.
- **LLM exposure rule:** only `exposedFields` and sanitized snippets; no raw PII unless policy allows.

### Governed Exceptions (legacy alignment)

Legacy or transitional paths that bypass strict policy enforcement are reclassified as **Governed Exceptions**:

- Must declare owner, expiry, and rollback trigger.
- Must include audit hooks and policy decision references.
- Must be enumerated in the provenance ledger with explicit scope.

### Evaluation & Observability

- **Metrics:** correctness (task-specific), citation/provenance accuracy, latency, token usage, cost, retrieval precision/recall proxy, user success (task completion, CSAT), context-rot degradation curves.
- **Tracing:** log structured "Context Pack" with: item IDs, source, security label, token cost, why-selected score, drop report, model invocation hash; emitted to provenance ledger.
- **Context-rot harness:** scenarios with long context, distractors, shuffled ordering, increasing k; measure answer quality vs. context size and position.

### SLOs (initial targets)

| SLI                          | Target          | Notes                                       |
| ---------------------------- | --------------- | ------------------------------------------- |
| Context pack correctness     | ≥ 90%           | Human review + verifier consistency checks. |
| Citation/provenance accuracy | ≥ 95%           | Must link to provenance ledger hashes.      |
| Token budget adherence       | ±5%             | Hard-fail if over 10%.                      |
| P95 assembly latency         | ≤ 1.5x baseline | Baseline captured pre-rollout.              |

### Failure Modes & Mitigations

- **Context rot / overload:** enforce budgets, decay, and compaction; fallback to minimal policy-safe pack.
- **Cross-tenant leakage:** policy guard + label filtering; redaction of PII flags before exposure.
- **Stale/low-confidence data:** decay-aware reranking; require confidence threshold; inject staleness warnings.
- **Retrieval drift:** periodic evaluation jobs with golden sets; alerts on recall/precision drops.
- **Summarization hallucination:** summaries must cite sources and include drop reports; verifier checks citation consistency.
- **Tool misuse:** tool-RAG restricts to authorized tools; verifier checks tool safety tags.

### Privacy & Security

- ABAC/OPA checks on every retrieval path; context packs carry security labels.
- Provenance ledger records hashes/signers for MemoryItems and summaries.
- PII flags trigger redaction or minimum-token summaries; policy denies exposure if label mismatch.
- Sandboxed artifacts stored with pre-signed, short-lived URLs and audit logs.

### Test & Verification Strategy (Tier B alignment)

- **Unit:** memory schema validation, budget enforcement, decay scoring, drop-report generation.
- **Integration:** policy guard + retrieval adapters with mocked OPA; provenance ledger writes.
- **E2E:** full Write→Select→Compress→Isolate pipeline with context-rot fixtures.
- **Security:** PII redaction checks, cross-tenant leakage attempts, governed exception expiry enforcement.
- **Evidence artifacts:** context-pack traces and harness reports stored under `artifacts/`.

### Rollout Plan

1. Baseline observability: add context-pack tracing and token/latency metrics.
2. Introduce `MemoryItem` schema and storage adapters (event log → vector/graph sync).
3. Ship hybrid retrieval and tool-RAG with reranker + policy guard.
4. Enable auto-compaction with drop reports; gate behind flag.
5. Add multi-agent isolation (planner/retriever/verifier/synthesizer) with runtime state exposure rules.
6. Harden with context-rot harness, alerts, and privacy checks; graduate to GA after SLO burn-in.
7. Graduation is **deferred pending** governance sign-off, policy evidence review, and golden path verification.

## Prioritized Backlog (Write / Select / Compress / Isolate / Eval+Obs)

### Write

1. **Memory schema + contracts** — Define `MemoryItem`, ABAC labels, decay functions. _AC:_ schema published, type definitions in `packages/common-types`. _Risk:_ Low. _Effort:_ M. _Deps:_ none.
2. **Event-log appenders** — Append-only storage with provenance hashes. _AC:_ audit log entries for new memories with signer. _Risk:_ M. _Effort:_ M. _Deps:_ (1).
3. **Memory emitters** — Instrument agents to emit episodic/procedural/semantic items. _AC:_ at least 3 emitter hooks per agent archetype. _Risk:_ M. _Effort:_ M. _Deps:_ (1),(2).
4. **Schema linting gates** — Validate `MemoryItem` payloads against policy schema. _AC:_ build fails on malformed or unlabeled memory. _Risk:_ M. _Effort:_ S. _Deps:_ (1).

### Select

5. **Hybrid retrieval adapter** — Keyword + vector + graph traversal interfaces with policy guard. _AC:_ top-k blended results with label filters. _Risk:_ M. _Effort:_ M. _Deps:_ (1).
6. **Tool-RAG** — Retrieve tool specs by keyword/embedding and filter by policy tags. _AC:_ irrelevant tools excluded in harness. _Risk:_ M. _Effort:_ S. _Deps:_ (5).
7. **Reranker + budgets** — Add reranker scoring and per-section token budgets. _AC:_ context packs respect budgets ±5%. _Risk:_ M. _Effort:_ M. _Deps:_ (5).
8. **Bad-retrieval defenses** — Dedup + off-topic/unsafe classifier + fallback minimal pack. _AC:_ harness shows rejection of injected noise. _Risk:_ M. _Effort:_ M. _Deps:_ (5),(7).
9. **Policy-decision ledgering** — Persist decision references per retrieval item. _AC:_ provenance ledger includes policy decision IDs. _Risk:_ M. _Effort:_ S. _Deps:_ (5).

### Compress

10. **Auto-compaction service** — Token-threshold trigger with hierarchical summaries and drop reports. _AC:_ 80% budget trigger emits summary with source links. _Risk:_ M. _Effort:_ M. _Deps:_ (7).
11. **Targeted blob summarizers** — Specialized summaries for logs/search/tool outputs. _AC:_ blob summaries include citations + dropped-fields list. _Risk:_ M. _Effort:_ S. _Deps:_ (10).
12. **Drop-report verification** — Verifier checks that summaries enumerate dropped items. _AC:_ failed verification blocks response. _Risk:_ M. _Effort:_ S. _Deps:_ (10).

### Isolate

13. **Runtime state object** — Implement `RuntimeState` with exposed fields whitelist. _AC:_ LLM payload excludes non-whitelisted fields. _Risk:_ M. _Effort:_ S. _Deps:_ (7).
14. **Sandboxed artifacts** — External storage for heavy outputs with handles. _AC:_ artifacts referenced via signed URLs; not in prompt. _Risk:_ M. _Effort:_ M. _Deps:_ (13).
15. **Agent role split** — Planner/retriever/verifier/synthesizer pipeline with policy gates. _AC:_ demo workflow shows role handoff traces. _Risk:_ M. _Effort:_ M. _Deps:_ (13).
16. **Governed exception registry** — Register any legacy bypass with owner/expiry. _AC:_ registry enforced in runtime audits. _Risk:_ M. _Effort:_ S. _Deps:_ (13).

### Eval + Obs

17. **Context-pack tracing** — Emit structured traces with item IDs, labels, token cost. _AC:_ traces visible in observability UI. _Risk:_ Low. _Effort:_ S. _Deps:_ (5).
18. **Metrics + dashboards** — Token/latency/cost, retrieval precision proxy, citation accuracy. _AC:_ Grafana/Looker tiles live. _Risk:_ M. _Effort:_ M. _Deps:_ (17).
19. **Context-rot harness** — Long-context/distractor/position-bias scenarios with score curves. _AC:_ baseline report stored in `artifacts/`. _Risk:_ M. _Effort:_ M. _Deps:_ (7),(10).
20. **Alerts + SLOs** — Thresholds on latency/token creep and citation drop. _AC:_ on-call alerts fire in staging. _Risk:_ M. _Effort:_ S. _Deps:_ (18).
21. **Evidence artifact automation** — Publish context-pack traces and harness results to evidence bundle. _AC:_ CI artifact emission validated. _Risk:_ M. _Effort:_ S. _Deps:_ (19).

## Implementation Plan (Atomic PR Slices)

1. **Prompt registration** — Add context-engineering prompt + registry entry; update PR metadata examples. _Files:_ `prompts/implement.context-engineering-upgrade-pack@v1.yaml`, `prompts/registry.yaml`. _Tests:_ lint yaml (schema). _Docs:_ prompt registry note.
2. **Design doc + roadmap refresh** — Add architecture doc and update `docs/roadmap/STATUS.json`. _Files:_ `docs/architecture/context-engineering-upgrade-pack.md`, `docs/roadmap/STATUS.json`. _Tests:_ markdown lint. _Docs:_ n/a beyond doc.
3. **Memory schema package** — Define `MemoryItem` types and decay helpers. _Files:_ `packages/common-types/`. _Tests:_ unit.
4. **Storage adapters + policy guard** — Implement event-log/vector/graph interfaces with OPA checks. _Files:_ `services/*` or `packages/*`. _Tests:_ integration with mocked OPA.
5. **Hybrid retrieval + reranker** — Add blended retrieval, budgets, and dedupe defenses. _Files:_ retrieval services; add budget enforcement. _Tests:_ unit + integration harness with fixtures.
6. **Tool-RAG + safety filters** — Tool selection limited to relevant specs and labels. _Files:_ tool registry, retrieval module. _Tests:_ unit + policy checks.
7. **Auto-compaction** — Introduce compactor with hierarchical summaries and drop reports. _Files:_ compaction service; storage for summaries. _Tests:_ unit (summary correctness), integration (token budget trigger).
8. **Runtime state + isolation** — Implement `RuntimeState`, sandbox references, and role wiring. _Files:_ agent runtime modules. _Tests:_ unit + e2e for exposed fields.
9. **Tracing + metrics** — Emit context-pack traces and dashboards. _Files:_ observability pipelines. _Tests:_ integration/log snapshot.
10. **Context-rot harness** — Add evaluation suite and CI target. _Files:_ `tests/context-rot/`. _Tests:_ harness execution in CI.

## Minimal Prototype (“Thin Vertical Slice”)

- **Workflow:** Planner agent receives user query → retriever builds hybrid context pack (keyword + vector + graph) → compactor trims to budget with drop report → synthesizer answers with citations while verifier checks policy labels; sandboxed tool log provided via handle.
- **Mock data:** 20 knowledge chunks (semantic), 5 procedural playbooks, 10 episodic session notes; 6 tool specs with safety tags; graph with 50 nodes.
- **Metrics:**
  - Context relevance ≥85% (human-rated) on 20-sample set.
  - Citation accuracy ≥90% with drop-report coverage of ≥95% of removed tokens.
  - Latency P95 < 1.5x baseline after compaction.
  - Token budget adherence within ±5%.
- **Success threshold:** Prototype passes metrics above and no policy violations in verifier logs; traces stored in provenance ledger.
