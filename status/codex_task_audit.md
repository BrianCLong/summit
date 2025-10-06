# Codex Task Audit — Implementation-Ready Backlog

This audit converts ambiguous or stalled Codex initiatives into actionable engineering tasks. Each entry documents the legacy item, its disposition, and the concrete follow-up required for delivery.

## 1. Fully deliver real-time narrative simulation engine (was blueprint-only)
- **Disposition:** Archived legacy blueprint in favor of implementation-ready sibling task below.
- **Actionable Task:** `feat/narrative-engine/real-time-core`
  - **Implementation Scope**
    - Create `packages/narrative-engine/src/core/SimulationEngine.ts` exporting `SimulationEngine` class with lifecycle hooks `initialize(config: SimulationConfig)`, `ingestEvent(event: NarrativeEvent)`, `advance(timestepMs: number)`, and `snapshot(): SimulationState`.
    - Add `packages/narrative-engine/src/core/types.ts` defining `SimulationConfig`, `NarrativeEvent`, `ActorState`, `EnvironmentState`, and `SimulationState` interfaces.
    - Implement adaptive narrative logic in `packages/narrative-engine/src/core/resolvers/AdaptiveResolver.ts` that scores actor intents using weighted heuristics and updates state transitions.
    - Wire a REST controller at `services/narrative-engine/src/routes/simulations.ts` with endpoints:
      - `POST /api/narrative-simulations` → instantiates simulation (validates config, returns `simulationId`).
      - `POST /api/narrative-simulations/:id/events` → streams events into the engine (supports batching).
      - `POST /api/narrative-simulations/:id/tick` → advances by payload `timestepMs` and returns updated state summary.
      - `GET /api/narrative-simulations/:id` → returns full `SimulationState` snapshot with provenance metadata.
    - Provide usage example in `samples/narrative-engine/basic-run.ts` demonstrating engine initialization, event ingestion, tick loop, and snapshot retrieval.
  - **Testing Requirements**
    - Add Jest specs under `packages/narrative-engine/src/core/__tests__/SimulationEngine.spec.ts` covering initialization defaults, deterministic progression with seeded RNG, and resilience to malformed events.
    - Create API contract tests in `services/narrative-engine/src/routes/__tests__/simulations.e2e.spec.ts` using Supertest to assert endpoint validation, event batching, and snapshot schema.
    - Include load-oriented smoke test `scripts/narrative-engine/simulation-smoke.test.ts` simulating 1k events with timing assertions (<250ms per tick).
  - **Acceptance Criteria**
    - All new tests pass with `npm run test -- --runInBand`.
    - Engine exposes metrics via existing observability hooks (`simulation_tick_duration_ms`, `active_simulations`).
    - Example script executes without unhandled promise rejections.

## 2. Develop MC learning module (lint/format blocked)
- **Disposition:** Converted to unblock-by-PR workflow; blueprint retained for reference but no longer primary task.
- **Actionable Task:** `fix/mc-learning/bootstrap-pr`
  - **Implementation Scope**
    - Commit current working module under `packages/mc-learning/` ensuring all runtime features demonstrated in README examples.
    - Push branch with failing lint/format as-is, capture tool output in `docs/tech-debt/mc-learning-lint-findings.md` (include command logs and offending files).
    - Update module README (`packages/mc-learning/README.md`) to describe setup, usage, and current lint gaps.
  - **Testing Requirements**
    - Run `npm test -- mc-learning` (or targeted script) ensuring unit/integration coverage is green despite lint failures.
    - Document exact lint commands attempted and failure logs in the tech-debt file (serves as acceptance evidence).
  - **Acceptance Criteria**
    - Pull request opened with passing tests and explicit note of deferred lint fixes linking to debt ticket.
    - Tech-debt ticket filed in tracker referencing README TODO section.
    - Documentation updated describing workaround for contributors until lint debt resolved.

## 3. Develop automated influence network extraction system (architecture-only)
- **Disposition:** Blueprint archived; new implementation track defined.
- **Actionable Task:** `feat/influence-mining/extractor-core`
  - **Implementation Scope**
    - Implement `packages/influence-mining/src/InfluenceNetworkExtractor.ts` with methods `ingest(graphInput: InfluenceGraphInput)`, `extractCommunities()`, `rankInfluencers(metric: InfluenceMetric)`, and `export(format: 'json'|'graphml')`.
    - Add graph mining algorithms under `packages/influence-mining/src/algorithms/`:
      - `LouvainCommunityDetector.ts` for modularity optimization.
      - `BetweennessCentrality.ts` for bridge scoring.
      - `InformationCascadeScorer.ts` combining temporal decay + edge weights.
    - Create ingestion pipeline `packages/influence-mining/src/pipeline/DataIngestionPipeline.ts` handling CSV and JSONL sources with schema validation via Zod.
    - Build benchmarking harness in `packages/influence-mining/benchmarks/` with datasets placed under `simulated_ingestion/influence/` (add README to document dataset provenance and licensing).
    - Expose CLI at `packages/influence-mining/bin/influence-extract.ts` to run ingestion → extraction → export with configurable algorithms.
  - **Testing Requirements**
    - Unit tests for each algorithm under `packages/influence-mining/src/algorithms/__tests__/` verifying expected cluster assignments and centrality outputs on fixture graphs.
    - Pipeline integration test `packages/influence-mining/src/pipeline/__tests__/DataIngestionPipeline.spec.ts` covering CSV/JSONL ingestion and schema validation failures.
    - Benchmark smoke test `packages/influence-mining/benchmarks/__tests__/benchmark-runner.spec.ts` ensuring harness executes and emits metrics snapshot.
  - **Acceptance Criteria**
    - `npm run test -- influence-mining` passes with ≥85% coverage on new modules.
    - CLI completes end-to-end on provided datasets producing JSON and GraphML outputs.
    - Benchmark harness logs throughput/latency metrics with regression thresholds recorded in README.

## 4. Tasks previously lacking status

### 4.1 Build a real-time narrative simulation engine
- **Status Update:** Superseded by Task 1; mark original request as archived to avoid duplication.
- **Follow-up:** Ensure Task 1 branch plan references this archival in commit message and closes associated ticket.

### 4.2 Design adaptive agent system
- **Actionable Task:** `feat/adaptive-agents/system-core`
  - **Implementation Scope**
    - Create `packages/adaptive-agents/src/AgentKernel.ts` with pluggable behavior modules (`perceive`, `decide`, `act`).
    - Add `packages/adaptive-agents/src/plugins/` with baseline `HeuristicBehaviorPlugin` and `ReinforcementLearningPlugin` (stubbed for follow-up training work).
    - Provide configuration schema `packages/adaptive-agents/src/config/AgentConfig.ts` using Zod.
    - Integrate with orchestrator via `services/orchestrator/src/routes/agents.ts` endpoints for registering agents, posting observations, and retrieving action plans.
  - **Testing Requirements:** Unit tests for kernel lifecycle, plugin registration, and endpoint validation under corresponding `__tests__` directories.
  - **Acceptance Criteria:** Kernel supports concurrent agents with isolation, endpoints documented in OpenAPI spec, tests green.

### 4.3 Develop adversarial misinformation defense platform
- **Actionable Task:** `feat/misinfo-defense/platform-mvp`
  - **Implementation Scope**
    - Scaffold `packages/misinfo-defense/` with services: `ingestion/ContentIngestionService.ts`, `analysis/ThreatClassifier.ts`, and `response/CountermeasurePlanner.ts`.
    - Add streaming pipeline definitions under `services/misinfo-defense/src/streams/` integrating with existing Kafka topics.
    - Deliver UI dashboard stub at `client/src/features/misinfo-defense/DefenseDashboard.tsx` showing alert table and countermeasure queue.
    - Document API contract in `docs/apis/misinfo-defense.md` with endpoints for content submission, threat scoring, and countermeasure activation.
  - **Testing Requirements:** Backend unit tests, React component tests with Testing Library, and contract tests for streaming pipeline mocks.
  - **Acceptance Criteria:** Automated tests pass, dashboard renders sample data via fixtures, and API doc published.

## 5. Open tasks with code review status
- **Audit Result:** No open Codex tasks with ready-to-merge code were located in the repository metadata (`status/`, `pr-open.json`). Documented here to avoid ambiguity.
- **Next Step:** When new code-bearing tasks appear, evaluate against merge criteria (tests, requirements) before closing or iterating.

---
**Overall Outcome:** Every previously ambiguous Codex task now has a clear state—archived or replaced with implementation-ready directives, complete with file paths, interfaces, endpoints, and testing expectations.
