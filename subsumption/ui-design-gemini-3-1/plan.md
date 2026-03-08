### A) MASTER PLAN (1.0–1.29)

**Phase 1: Foundation & Alignment (1.0 - 1.9)**
1.0 Assert GA Milestone constraints: Verify no new infra/DB, strictly adhere to "Provable Intelligence" wedge.
1.1 Extract core UX paradigms from Gemini 3.1 UI design methodologies mapping to Case-First Investigation UX.
1.2 Register Agent URI and schema hashes for new Palette operations.
1.3 Scaffold `subsumption/ui-design-gemini-3-1/` directory.
1.4 Update `CHANGELOG.md` (`## [Unreleased]`) and assert `EVID-<id>` tags for changes.
1.5 Define UI components in `client/` (Vite 7+, Node 20+) to mirror Gemini 3.1 interaction flows.
1.6 Enforce `summit_*` metrics and `SummitTracer` on all new UI-to-API boundaries.
1.7 Draft UI evidence generation: Map user interactions to 'summit.lineage.stamp.v1'.
1.8 Establish deterministic verification thresholds for Gemini-inspired UI workflows.
1.9 Submit Lane: `lane/auto-merge-now` PR 1 - Subsumption Manifest & Foundation.

**Phase 2: Core Implementation (1.10 - 1.19)**
1.10 Implement React/Vite components enforcing deterministic render trees.
1.11 Integrate with `api/graphql` without breaking existing schemas.
1.12 Tie UI events to `server/src/observability/` using standard OTel namespaces.
1.13 Validate that UI generation implies no client-side inference (all compute in `server` boundaries).
1.14 Bind components to 'Evidence Map' ensuring every UI claim links to stable GraphRAG sources.
1.15 Enforce strictly defensive UI modeling (no offensive capabilities).
1.16 Build mock tool boundary to enforce Prompt Injection defense.
1.17 Pass 'Context Budget Gate' for GraphRAG UI bindings.
1.18 Sample and hash EXPLAIN plans for any new UI-driven Neo4j queries.
1.19 Submit Lane: `P0-candidate` PR 2 - Core UI & Observability hooks.

**Phase 3: Integration & Validation (1.20 - 1.29)**
1.20 Connect Agent prompts (`prompts/registry.yaml`) for UI state transitions.
1.21 Synthesize test fixtures in `GOLDEN/datasets/governance-fixtures/`.
1.22 Verify all Node ESM imports (e.g., `Ajv2020`).
1.23 Generate Cypher plan heatmaps using `tools/cypher/`.
1.24 Run 'Governance Scribe' to generate GAR for UI updates.
1.25 Verify no drift in `scripts/ci/check_required_contexts_drift.mjs`.
1.26 Execute `scripts/observer.sh` local run to ensure merge-train stability.
1.27 Validate AIBOM-like bundle generation for the UI pipeline.
1.28 Finalize E2E Provable Action Latency (PAL) metric collection via `metrics.json`.
1.29 Submit Lane: `lane/auto-merge-now` PR 3 - Verification, GAR & Final Release.

### B) FIVE SUB-AGENT PROMPTS (A–E)

**Prompt A: Codex (Core Scaffolding & Merge Engine)**
"Implement the foundational schema mappings and Merge Engine logic for the Gemini 3.1 UX flows. Ensure `tsconfig.json` retains `types: []` to avoid global pollution. Verify deterministic `EVID-<id>` mapping and hash stability. Target: PR 1 (Foundation). Require EVID-CDX-001 output."

**Prompt B: Palette (Case-First Investigation UX)**
"Translate Gemini 3.1 UI interactions into the Summit Case-First investigation model. Ensure Vite 7+/Node 20+ compatibility. All UI output must trace back to stable GraphRAG sources without client-side LLM inference. Ensure 'Provable Intelligence' wedge narrative is maintained. Target: PR 2 (UI Implementation). Require EVID-PLT-001 output."

**Prompt C: Antigravity (Evidence/Lineage Integrity Gate)**
"Design the Evidence/Lineage Integrity Gate for the new UI components. Ensure all interactions conform to 'summit.lineage.stamp.v1' with deterministic hashes and no wall-clock timestamps. Wrap logic to guarantee failure if context limits are breached. Target: PR 2/3 (Integrity Hooks). Require EVID-AGT-001 output."

**Prompt D: Jules (Governance & Policy Logic)**
"Draft the Governance Acceptance Record (GAR) for the Gemini 3.1 UI design integration. Output must follow the strict four-section template (What Changed, Why, Risk, Rollback) in `docs/governance/acceptance/`. Verify that 'Prompt Injection / Tool Boundary Gate' checks pass. Target: PR 3 (Governance & GAR). Require EVID-JLS-001 output."

**Prompt E: Observer (Telemetry & CI Tracking)**
"Configure OTel telemetry for the new UI flows using `summit_*` metrics. Monitor the Merge Engine queue pressure for the resulting PRs. Ensure the `metrics.json` records the exact 'Provable Action Latency (PAL)' improvements. Track PR drift and ensure no required-check contexts are altered. Target: Continuous."

### C) CONVERGENCE PROTOCOL

- **Condition 1 (Governance):** `scripts/ci/governance-meta-gate.mjs` exits 0. No context drift detected.
- **Condition 2 (Lineage):** All generated JSON artifacts pass `summit.lineage.stamp.v1` schema validation.
- **Condition 3 (Performance):** GraphRAG UI bindings do not increase the context budget by >0%. Cypher plan hashes match the registered `EXPLAIN` baselines.
- **Condition 4 (CI Boundaries):** No external network requests made during `pnpm test`. `NODE_OPTIONS='--experimental-vm-modules'` executes cleanly.
- **Condition 5 (Verification):** PR 1-3 sequentially attain `ci-green` and auto-merge via exact boolean rules in `LANE/auto-merge-now` and `P0-candidate`.

### D) BUNDLE MANIFEST + CI VERIFIER SPEC

**Bundle Manifest:**
- `manifest.yaml`: Exact project configuration.
- `plan.md`: The integrated Subsumption plan.
- `report.json`: Deterministic trace of tool execution, input/output hashes, and Agent URI verification.
- `metrics.json`: PAL measurements and reproducibility match rates.

**CI Verifier Spec:**
1. Action Step: Run `cli/commands/verify.ts report.json`.
2. Action Step: Run `npx tsx scripts/check-doc-links.ts` to ensure documentation integrity.
3. Action Step: Ensure `uses: pnpm/action-setup@v4` runs before `actions/setup-node`.
4. Action Step: Execute `lint:release-policy` asserting `docs/releases/reason-codes.yml` integration.
