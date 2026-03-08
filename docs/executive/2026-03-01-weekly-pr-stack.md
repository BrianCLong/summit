# Strategic Execution Plan: Weekly PR Stack (March 2026)

**Date:** 2026-03-01
**Owner:** Jules (Operating Brain & Release Captain)
**Scope:** Summit CompanyOS (Defensive Intelligence & Risk Anticipation Platform)

## Executive Summary

Based on the strongest late Feb 2026 research on agentic systems and real-world failure modes, this document outlines the required PR stack for Summit. The mandate is to incorporate and outperform current research on agent reliability, tool-use safety, prompt injection defenses, RAG robustness, and observability. All features must adhere to Summit's strict governance standards: defensive intelligence positioning, institutional tone, and rigorous security policies.

All deliverables explicitly avoid terms implying 'psyops', 'disinformation', 'market manipulation', or 'cognitive hacking', in favor of a regulator-aware, institutional posture focused on AI-driven behavioral market intelligence and risk anticipation.

## Core Directives & Memory Constraints Applied

*   **Defensive Positioning:** All narratives and features are aligned with "AI-Driven Behavioral Market Intelligence & Risk Anticipation."
*   **Scientific Rigor:** Intelligence features, reasoning models, and evaluations include reproducible seeds, statistical significance testing (p < 0.05) with power analysis, an SBOM/SPDX report, and a dual-use mitigation plan. Code is constrained to an Apache-2.0 compatible stack.
*   **Run Manifest Policy:** Writes require a `run_id` propagating from CLI through services to storage. The guard clause is implemented at the storage adapter/repository layer, not in HTTP middleware.
*   **OpenLineage Compliance:** `openlineage.run_id` generation and OpenLineage events (START/COMPLETE) are strictly implemented at the job execution boundary (e.g., in BullMQ job processors) and propagated downstream.
*   **Evidence Mapping:** Generated evidence strictly follows the pattern `sui/<eval_name>/<git_sha>/<dataset_id>/<seed>`.
*   **Agent Roles:** Codex operates in FIX MODE to resolve blockers; Jules acts as stabilization & analysis agent verifying CI integrity; Observer monitors CI saturation; Maestro orchestrates merge cadence.

---

## PR Stack 1: Reliability Integrity Gate

**Goal:** Enforce agent reliability as a first-class contract, not a "best effort." Measure success-rate, run-to-run variance, and fault robustness.

*   **Paths/Files:**
    *   `src/runtime-gates/reliability.ts` (New Gate)
    *   `src/evals/reliability_harness.ts`
    *   `docs/ci/linter/rules/reliability_policy.yml`
*   **Gates:**
    *   **Reliability Integrity Gate:** Fails the PR if the deterministic `reliability.json` emitted during CI shows variance or failure rates exceeding the threshold defined in `reliability_policy.yml`.
*   **Acceptance Criteria:**
    *   Agent runs emit a deterministic `reliability.json` containing `success_rate`, `variance_score`, and `robustness_index`.
    *   Statistical significance testing (p < 0.05) and power analysis are included in the eval harness.
    *   SBOM/SPDX report and dual-use mitigation plan provided.
*   **Next Prompts:**
    *   **Jules:** "Implement the Reliability Integrity Gate in `src/runtime-gates/reliability.ts`, ensuring the evaluation logic produces statistically significant results (p < 0.05). Configure the `reliability.json` output format."
    *   **Observer:** "Monitor the Reliability Integrity Gate execution times in CI to ensure it does not cause queue amplification."

## PR Stack 2: Prompt Injection / Tool Boundary Gate

**Goal:** Treat prompt injection as an agent-breaking vulnerability. Control information flow at the tool boundary.

*   **Paths/Files:**
    *   `src/runtime_security/tool_boundary_policy.ts` (New Policy Engine)
    *   `src/runtime-gates/injection_gate.ts` (New Gate)
    *   `src/evals/agent_pi_tests.ts`
*   **Gates:**
    *   **Prompt Injection / Tool Abuse Gate:** Fails PRs if (a) injected instructions change tool choice, (b) sensitive data crosses tool boundaries without redaction, or (c) untrusted content is treated as authority.
*   **Acceptance Criteria:**
    *   Capability-scoped tool contracts (read/write/network) are strictly enforced by `tool_boundary_policy.ts`.
    *   Every tool call produces signed, replayable evidence (inputs/outputs hashed, redaction rules enforced, provenance attached) saved to the Provenance Ledger.
    *   AgentPI-style context-dependent injection tests added to the evaluation suite.
*   **Next Prompts:**
    *   **Jules:** "Develop the `Prompt Injection / Tool Abuse Gate` logic. Ensure every tool call generates a transaction record with hashed inputs/outputs and complies with the Run Manifest policy."
    *   **Codex (FIX MODE):** "Resolve any policy violations in existing tools caught by the new `tool_boundary_policy.ts`."

## PR Stack 3: Context Budget Gate & Robust RAG

**Goal:** Manage GraphRAG token blowups and implement reliability-weighted consensus against corpus poisoning.

*   **Paths/Files:**
    *   `src/graph/rag_consensus.ts`
    *   `src/runtime-gates/context_budget_gate.ts` (New Gate)
    *   `tools/neo4j/seed_queries.txt` (Update)
*   **Gates:**
    *   **Context Budget Gate:** Flags token bloat regressions and forces graph summarization/compaction before production.
*   **Acceptance Criteria:**
    *   A retrieval layer that builds a contradiction graph and selects a consistent majority weighted by source reliability.
    *   RAG outputs bound to an Evidence Map, linking every claim to supporting sources and an auditable filtering decision log.
    *   GraphRAG-vs-RAG switch backed by evaluation criteria.
    *   `EXPLAIN` query plans sampled and hashed to track Neo4j query planner regressions.
*   **Next Prompts:**
    *   **Jules:** "Implement the `Context Budget Gate` and the RAG consensus filtering layer in `src/graph/rag_consensus.ts`. Ensure the Evidence Map generates IDs following the `sui/<eval_name>/<git_sha>/<dataset_id>/<seed>` pattern."

## PR Stack 4: Agentic Memory as Tool Actions

**Goal:** Reframing memory as explicit tool actions (store/retrieve/update/summarize/discard) rather than heuristic glue code.

*   **Paths/Files:**
    *   `core/memory/tools.ts` (New)
    *   `core/memory/ledger.ts` (New)
*   **Gates:**
    *   Memory operations must pass standard tool boundary policies (PR Stack 2).
*   **Acceptance Criteria:**
    *   Memory API implemented as explicit tools with strict policies (TTL, scope, redaction).
    *   A memory ledger with stable hashing and "no hidden state changes" rules to make writes reviewable and deterministic.
*   **Next Prompts:**
    *   **Jules:** "Refactor the memory management in `core/memory/` to expose operations strictly as tool actions. Implement `core/memory/ledger.ts` to log deterministic state changes."

## PR Stack 5: OpenLineage 1.44.1 + AIBOM Provenance

**Goal:** Upgrade OpenLineage, align with OTEL tracing, and generate cryptographically verifiable AI Bill of Materials (AIBOM).

*   **Paths/Files:**
    *   `src/telemetry/lineage_stamp.ts`
    *   `src/core/queue/governor.ts` (Update for boundary emission)
    *   `package.json`
*   **Gates:**
    *   **Lineage Stamp Contract:** Enforces that every run produces an AIBOM-like bundle.
*   **Acceptance Criteria:**
    *   Upgrade OpenLineage to version 1.44.1.
    *   OpenLineage events (START/COMPLETE) and `openlineage.run_id` generation implemented strictly at the job execution boundary (BullMQ job processors).
    *   SLSA provenance predicate type used in the attestation set.
    *   Every Summit workflow produces an AIBOM-like bundle (inputs, transforms, toolchain, outputs, signatures) that is fully replayable.
*   **Next Prompts:**
    *   **Jules:** "Upgrade OpenLineage dependencies to 1.44.1. Implement the Lineage Stamp Contract in `src/core/queue/governor.ts` at the job execution boundary, ensuring SLSA provenance and AIBOM generation."
    *   **Antigravity:** "Validate the generated AIBOM artifacts against the SLSA provenance v0.1 specification and ensure OTEL semantic conventions are correctly mapped."
