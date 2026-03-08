# SUMMIT MASTER ORCHESTRATION BOARD

## Milestone 1: Retrieval Foundation (Core + VTII)
**Goal:** Establish schemas, provenance, and a unified, context-aware retrieval engine.

| PR ID | Feature / PR Title | Owning Agent | Depends On | CI Gates | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-A1** | `feat(common)`: Contracts, provenance, schema validation | Architect | *None* | `contracts.yml`, `provenance-check.yml` | Schemas compile; provenance fields present; validation CLI works. |
| **PR-A2** | `feat(intelgraph)`: Event, narrative, resource graph labels | Jules | **A1** | `contracts.yml` | IntelGraph nodes/edges support new schemas. |
| **PR-A3** | `feat(eval)`: Shared fixture loader & eval harness base | Eval/Research | **A1** | `test-core.yml` | Golden fixtures load successfully; baseline harness runs. |
| **PR-B1** | `feat(vtii)`: Query contracts & decomposition | Codex | **A1** | `contracts.yml` | Query parser extracts entities, time, geo, and narrative hints. |
| **PR-B2** | `feat(vtii)`: Multi-channel candidate generation | Jules | **B1**, **A2** | `test-core.yml` | Candidates generated via Qdrant, Neo4j, and narrative lineage. |
| **PR-B3** | `feat(vtii)`: Temporal & geospatial filtering | Codex | **B2** | `test-core.yml` | Time overlap and H3 distance decay successfully filter pool. |
| **PR-B4** | `feat(vtii)`: Graph neighborhood expansion | Jules | **B3** | `test-core.yml` | 1-3 hop IntelGraph expansion; path features extracted. |
| **PR-B5** | `feat(vtii)`: Blended reranker + provenance adjust | Codex | **B4** | `test-core.yml` | Scoring combines 5 dimensions + applies contradiction penalties. |
| **PR-B6** | `feat(vtii)`: Evidence bundle assembly & APIs | Jules / Gov. | **B5**, **A3** | `eval-vtii.yml`, `test-api.yml` | VTII bundle returned; Recall@k and provenance gates pass. |

## Milestone 2: Analytical Intelligence (DriftLens + Cascade)
**Goal:** Track narrative mutations and discover multi-step causal event chains using VTII's substrate.

| PR ID | Feature / PR Title | Owning Agent | Depends On | CI Gates | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-C1** | `feat(driftlens)`: Baseline narrative drift scoring | Codex | **B6** | `eval-driftlens.yml` | Semantic, frame, and audience shift computed between windows. |
| **PR-C2** | `feat(driftlens)`: Lineage builder & mutation classification | Codex | **C1** | `eval-driftlens.yml` | Identifies reframed/laundered/branching narratives. |
| **PR-C3** | `feat(driftlens)`: Mutation graph UI | UI/War Room | **C2** | `eval-driftlens.yml` | War Room displays timeline strip and mutation tree. |
| **PR-D1** | `feat(cascade)`: Event graph substrate & candidate edges | Jules | **B6** | `eval-cascade.yml` | Candidate causal edges generated via time/geo/actor overlap. |
| **PR-D2** | `feat(cascade)`: Path search & cascade scoring | Codex | **D1** | `eval-cascade.yml` | k-best paths discovered; cascade score calculated. |
| **PR-D3** | `feat(cascade)`: Explanation layer & UI panels | UI/War Room | **D2** | `eval-cascade.yml` | UI displays chain confidence and alternative path explorer. |

## Milestone 3: Agent Flywheel (Playbook)
**Goal:** Agents accumulate procedural memory, evolving their investigative strategies over time.

| PR ID | Feature / PR Title | Owning Agent | Depends On | CI Gates | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-E1** | `feat(playbook)`: Agent run recorder & procedure store | Jules | **A1** | `contracts.yml`, `test-core.yml` | Every agent run yields an `AgentRun` object with cost/latency. |
| **PR-E2** | `feat(playbook)`: Fragment extraction & clustering | Codex | **E1** | `test-core.yml` | Successful tool chains extracted and clustered by task family. |
| **PR-E3** | `feat(playbook)`: Recombination & promotion gates | Gov. / Eval | **E2**, **A3** | `eval-playbook.yml`, `golden-main.yml` | Procedures promoted only if offline eval beats baseline metrics. |

## Milestone 4: Forecast Layer (CWMI)
**Goal:** Continuously simulate latent geopolitical states to project forward narrative and event trajectories. *(Strict dependency on M1-M3 data maturity).*

| PR ID | Feature / PR Title | Owning Agent | Depends On | CI Gates | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-F1** | `feat(cwmi)`: World-state contracts & builder | Jules | **B6**, **C2**, **D2** | `cwmi-contract-check.yml` | `WorldState` built from graph/narrative windows. |
| **PR-F2** | `feat(cwmi)`: State feature extraction | Codex | **F1** | `test-core.yml` | Actor, narrative, and resource vectors extracted with uncertainty. |
| **PR-F3** | `feat(cwmi)`: Transition engine v1 | Codex | **F2** | `test-core.yml` | Hybrid engine (rules + temporal/graph) predicts `state_t+1`. |
| **PR-F4** | `feat(cwmi)`: Scenario projection & branching | Jules | **F3** | `test-core.yml` | 7-day and 30-day projected branches generated from state. |
| **PR-F5** | `feat(cwmi)`: Historical analogs & backtesting | Eval/Research | **F4** | `eval-cwmi.yml` | Harness replays past windows; compares forecast vs reality. |
| **PR-F6** | `feat(cwmi)`: Intervention comparison & APIs | Jules / Gov. | **F5** | `eval-cwmi.yml`, `golden-main.yml` | A/B intervention deltas returned; calibration passes CI. |
