# Repo Review → Top 3 Codex Prompts
**IntelGraph Advisory Report | Branch:** `feature/codex-top-3`

## Consensus Summary
- **Unanimous View:** Ship (1) **Provenance & Claim Ledger** (+ verifier & disclosure wallets), (2) **NL Graph Querying + GraphRAG** with citations/redaction, and (3) **Authority-bound policy enforcement (LAC)** integrated with ABAC/OPA & reason-for-access audit. These unlock the platform’s *secure, multi-tenant intelligence graph with provenance by design*, reflected across capability maps and roadmaps.
- **Dissents:** 🛰 **Starkey** argues **Zero-Knowledge Deconfliction** deserves equal priority for alliance operations. Ranked next after these three because the primitives (prov-ledger, NLQ/RAG, LAC/ABAC) are prerequisites for safe federation.

## Individual Commentaries
- 🪄 **Elara Voss**
  - “By the runes of Scrum… lock the Prov-Ledger + Verifier as Sprint 1–2 walking skeleton to unblock report studio and disclosure flows.”
  - NL-to-Cypher preview with undo boosts novice velocity; guard with cost/row estimates.
- 🛰 **Starkey — DISSENT (priority order)**  
  - Reality check: partners need ZK-TX fast for deconfliction without data handoff; adversaries exploit the lag.  
  - Keep LAC strict—no “audit later” escape hatches.
- 🛡 **Foster**  
  - Operational vectors indicate LAC + reason-for-access prompts reduce selector misuse and civil-harm risk.  
  - Prov-Ledger must emit court-verifiable bundles; missing proofs block export.
- ⚔ **Oppie (11-persona)**  
  - “We decree unanimously: proof-carrying outputs or no outputs.” (PCA + wallets).  
  - Reserve ZK-TX for wave-2 once LAC + Prov-Ledger bite.
- 📊 **Magruder**  
  - For executive traction: these three convert differentiators into demos/kPIs users can verify day-1 (PCQ checks, citation coverage %, policy-hit rate).
- 🧬 **Stribol**
  - Cross-source analysis reveals NLQ+GraphRAG with redaction-aware retrieval is the keystone for hypothesis workbench and narrative builder.

## Execution Playbook (Ultra-Maximal)
- **Non-negotiable gates:** proof-carrying outputs only; “no citation, no publish”; export blocks on license/TOS violations; LAC enforced at compile-time with actionable denials; human-readable appeal paths everywhere.
- **Cross-cutting SLOs:** p95 < 800ms for NLQ generation, p95 < 1.5s end-to-end GraphRAG response on dev fixtures; ≥200 evidence registrations/sec in Prov-Ledger dev profile; zero silent policy bypasses.
- **Artifacts to ship:** CLI verifier with golden fixtures, disclosure wallet builder + revocation UX, policy simulator with diff view, NL→Cypher preview UI with plan/cost estimates, GraphRAG rationale+path visualizer, audit breadcrumbs into report studio.
- **Guardrails:** deterministic transforms with recorded seeds; OPA/ABAC hooks on every path (NLQ plan approval, GraphRAG redaction enforcement, export/licensing checks); reason-for-access prompts logged on write + read; two-key workflows on high-risk exports.
- **Telemetry & observability:** budget manager surfacing token/row/cost hints; policy hit-rate dashboards; citation coverage %, revocation hit-rate; anomaly alerts on selector misuse and denied-but-retried flows.
- **Delivery cadence:** Sprint 1–2 walking skeleton for Prov-Ledger+Verifier + minimal disclosure wallet; Sprint 2–3 NLQ preview + GraphRAG citations/redaction; Sprint 3–4 LAC bytecode compiler + policy simulator + gateway interceptors; keep ZK-TX deconfliction queued post-core gates.

## Chair Synthesis — The Three Prompts (paste into Codex/Copilot as-is)

### Prompt 1 — Provenance & Claim Ledger (Service) + External Verifier + Disclosure Wallets
You are a principal engineer implementing IntelGraph’s Provenance & Claim Ledger.

**Goal**
- Build a service that records evidence registration, source signatures/hashes, claim parsing to Claim nodes, contradiction graphs, and produces export manifests verifiable offline. Also ship a CLI verifier and “Provenance Wallet” bundles for selective disclosure.

**Repo Targets**
- `services/prov-ledger/**` (TypeScript or Go service; pick one and scaffold)
- `packages/prov-model/**` (shared protobuf/GraphQL schema + Merkle utilities)
- `cmd/ig-verify/**` (CLI verifier: verify `*.manifest.json` hash trees, toolchain versions, and replay seeds)
- `apps/web/modules/disclosure/**` (wallet assembly UI + revocation)

**Core Requirements**
- Write GraphQL or gRPC APIs:
  - `registerEvidence(source_uri, hash, license, transform_chain[])`
  - `registerClaim(subject_id, predicate, object_id|literal, evidence_refs[], confidence, timestamp)`
  - `buildDisclosureBundle(case_id, audience, redaction_rules[]) -> *.wallet.zip + manifest.json`
- Manifests include: input hashes, transform DAG, model cards/hyperparams if applicable, and timestamps.
- Contradiction graph: detect conflicting claims; tag with provenance density metrics.
- External verifier: offline check of hashes + deterministic replay of transforms on fixtures. Fails hard on any mismatch.

**Security & Governance**
- Enforce license/TOS at export; block with human-readable reason + appeal path. (Wire to policy engine stub.)
- All writes emit audit events with reason-for-action.

**Testing & Acceptance (must pass CI)**
- Golden fixtures: `ingest → claim → export → offline verify` == PASS (“tamper alarm” on any delta).
- Wallet revocation test: opening a revoked bundle shows revocation notice + fail on integrity check.
- Throughput: ≥ 200 evidence regs/sec on dev profile.
- Docs: “hello evidence”, “hello wallet”.

**References (must satisfy)**
- Provenance & Claim Ledger; verifiable exports and chain-of-custody. `:contentReference[oaicite:17]{index=17}`
- Final Product: provenance/lineage + disclosure packager. `:contentReference[oaicite:18]{index=18}` `:contentReference[oaicite:19]{index=19}`
- PCA/Wallets expectations. `:contentReference[oaicite:20]{index=20}` `:contentReference[oaicite:21]{index=21}`

### Prompt 2 — NL Graph Querying + GraphRAG (Citations & Redaction-Aware)
You are building IntelGraph’s AI Copilot query path.

**Goal**
- Implement NL→Cypher generation with preview + cost/row estimates, sandbox execution, undo/redo.
- Implement GraphRAG that retrieves subgraphs with path rationales, always emits inline citations, and is redaction-aware.

**Repo Targets**
- `services/nlq/**` (NL→Cypher generator, validation, telemetry)
- `services/graphrag/**` (retriever over case-scoped indices, path rationales, citation resolver)
- `apps/web/panels/ai/**` (query preview, diff vs manual Cypher, “explain this view” overlays)

**Functional Requirements**
- NLQ: generate Cypher for Person/Org/Event/etc.; show plan estimates; never auto-run without preview.
- GraphRAG: return `{ answer, citations[], paths[], redactions[] }`, where each citation resolves to evidence or claim IDs from prov-ledger.
- Redaction: enforce field/edge suppression based on policy labels; return “missing due to policy” placeholders.
- XAI: capture rationales linking answer→nodes/edges.

**Quality Gates**
- ≥95% syntactic validity on test prompts; rollback/undo for unsafe or slow plans.
- “No-citation, no-publish”: block narrative builder when any citation fails to resolve via prov-ledger.
- Telemetry: p95 generation latency under 800ms on dev fixtures; budget manager surfaces cost hints.

**References (must satisfy)**
- NL Graph Querying preview + sandbox; GraphRAG with citations/redaction. `:contentReference[oaicite:22]{index=22}`
- Final Product Copilot: NL query + RAG with inline citations. `:contentReference[oaicite:23]{index=23}`
- Capability map anchors this pillar. `:contentReference[oaicite:24]{index=24}`

### Prompt 3 — License/Authority Compiler (LAC) + ABAC/OPA Integration & Reason-for-Access Audit
You are implementing authority-bound policy enforcement.

**Goal**
- Compile licenses, warrants, DPAs, and tenant/case policies into executable guards on every query (SQL/Cypher/exports).
- Integrate ABAC/RBAC with OPA; require reason-for-access prompts and step-up auth for sensitive scopes.

**Repo Targets**
- `services/policy-lac/**` (DSL→WASM bytecode; simulators; diff previews)
- `services/authz/**` (OPA policies, ABAC attribute resolver, JWKS/SSO wiring)
- `apps/web/policy/**` (policy editor, dry-run simulator, reason-for-access UI)
- `gateways/**` (query interceptors for Postgres/Neo4j/exports)

**Functional Requirements**
- Intercept at query-compile time; deny unexecutable ops with explicit, actionable justifications.
- Log purpose limitation tags and bind legal basis to every result set; surface audit breadcrumbs to report studio.
- “Two-key” high-risk operations; ombuds queue on appeals.

**Acceptance & KPIs**
- 100% policy hit-rate on test corpus; proposed policy-change simulator shows impact/diff.
- Audit shows who/what/why/when; anomaly alerts on selector misuse.
- End-to-end: blocked export renders license clause + owner + override workflow.

**References (must satisfy)**
- LAC spec + “unexecutable violations”. `:contentReference[oaicite:25]{index=25}`
- ABAC/OPA, warrant binding, reason-for-access prompts. `:contentReference[oaicite:26]{index=26}`
- Final Product guardrails messaging. `:contentReference[oaicite:27]{index=27}`

## Risk Matrix (for these three)
| Threat/Failure Mode               | Severity | Mitigation                                                                                 |
| --------------------------------- | -------: | ------------------------------------------------------------------------------------------ |
| Citation drift / missing evidence |     High | “No-citation, no-publish”; tie GraphRAG citations to prov-ledger IDs + offline verifier.   |
| Policy bypass / selector misuse   | Critical | LAC bytecode + OPA gate + reason-for-access prompts; two-key exports; anomaly alerts.      |
| License/TOS violations on export  |     High | Export blockers with human-readable reasons + appeal path; disclosure wallet revocation.   |
| Performance regressions (NLQ/RAG) |   Medium | Plan estimates, sandbox, budget manager; SLOs p95 < 1.5s for typical graph queries.        |

## Attachments
- OKR focus: **P0** Prov-Ledger+Verifier, **P0** NLQ+GraphRAG (citations), **P0** LAC+ABAC/OPA.
- “Next up”: **ZK-TX Deconfliction** once these gates ship (per Starkey).
