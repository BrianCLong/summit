# Narrative Operations 2.0 – 90-Day Execution Plan

**Epic Goal:** Evolve Summit from campaign‑level analysis into an integrated system that models narratives, actors, audiences, cognition, synthetic media, and the "market of narratives," with early‑warning and counter‑campaign design baked into the workflow.

## Phase 1: Foundation – Cognitive & Influence Infrastructure (Days 0–30)
**Focus:** Workstream 1 (Cognitive & Audience State) + Workstream 3 (Influence Pathways & Early Warning)

### Objectives
- Establish the data model for Audience Cognition and Influence Pathways.
- Enable ingestion and querying of cognitive states and narrative cascades.
- Implement early-warning signals for tipping points.

### Milestones
- [ ] **M1.1:** Neo4j Schema & GraphQL API for Audience/Cognition deployed.
- [ ] **M1.2:** Influence Pathway tracking and IO Actor attribution logic active.
- [ ] **M1.3:** Early Warning System firing on test data.

### Concrete PR Rails

#### 1. Schema & Data Layer (Backend)
- **PR 1.1: Cognitive State Schema Extensions**
    - **Files:** `server/src/graphql/schema/cognitive-security.graphql`, `packages/graph-database/schema/`
    - **Changes:** Add `AudienceSegment`, `CognitiveState`, `CognitiveAttack` types.
    - **Neo4j:** Define constraints for `AudienceSegment(id)`.
- **PR 1.2: Influence Pathway Schema Extensions**
    - **Files:** `server/src/graphql/schema/cognitive-security.graphql`
    - **Changes:** Add `NarrativeCascade`, `CascadeHop`, `IOActor`, `TippingPointIndicator`.
    - **Logic:** Add cypher queries for `influencePathways` traversal.

#### 2. Ingestion & Logic (Backend)
- **PR 1.3: Cognitive State Ingestion Pipeline**
    - **Files:** `server/src/services/cognitive-state/`
    - **Function:** Ingest audience data and map to segments. Compute `beliefVectors`.
- **PR 1.4: Cascade Detection Service**
    - **Files:** `server/src/services/narrative-detection/`
    - **Function:** Detect `NarrativeCascade` events from stream. Link to `IOActor`.

#### 3. Frontend & Visualization
- **PR 1.5: Audience Profile View**
    - **Files:** `client/src/pages/Audience/`
    - **UI:** Display Segment details, fear sensitivity, and polarization metrics.
- **PR 1.6: Influence Graph Visualizer**
    - **Files:** `client/src/components/Graph/`
    - **UI:** Force-directed graph of `NarrativeCascade` showing hops and actors.

---

## Phase 2: Synthetic Media & Market Dynamics (Days 31–60)
**Focus:** Workstream 2 (Synthetic/Memetic) + Workstream 4 (Market/Institutions)

### Objectives
- Track synthetic assets (deepfakes) and meme lineages.
- Model the "Market of Narratives" and institutional resilience.
- Detect swarms and coordinated inauthentic behavior (CIB).

### Milestones
- [ ] **M2.1:** Synthetic Asset detection and lineage tracking live.
- [ ] **M2.2:** Narrative Market dashboard operational.
- [ ] **M2.3:** Institution resilience scoring active.

### Concrete PR Rails

#### 1. Schema & Data Layer
- **PR 2.1: Synthetic & Meme Schema**
    - **Files:** `server/src/graphql/schema/cognitive-security.graphql`
    - **Changes:** Add `SyntheticAsset`, `Meme`, `SwarmEvent`.
- **PR 2.2: Market & Institution Schema**
    - **Files:** `server/src/graphql/schema/cognitive-security.graphql`
    - **Changes:** Add `Institution`, `Norm`, `NarrativeCompetition` edges.

#### 2. Logic & Analysis
- **PR 2.3: Swarm Detection Engine**
    - **Files:** `server/src/services/swarm-detection/`
    - **Function:** Temporal clustering of events to identify `SwarmEvent`.
- **PR 2.4: Narrative Market Share Calculator**
    - **Files:** `server/src/services/market-dynamics/`
    - **Function:** Compute "share of voice" and "alignment scores" for narratives vs norms.

#### 3. Frontend
- **PR 2.5: Synthetic Threat Map**
    - **UI:** Geospatial/Platform view of deepfake spread.
- **PR 2.6: Market Dynamics Dashboard**
    - **UI:** Charts showing narrative competition and institution health over time.

---

## Phase 3: Operationalization – Counter-Ops & Analyst Workbench (Days 61–90)
**Focus:** Workstream 5 (Counter-Campaign) + Workstream 6 (Analyst Workbench)

### Objectives
- Enable planning and execution of counter-narratives.
- Enforce doctrine and policy constraints.
- Provide a unified "Battle Room" for analysts.

### Milestones
- [ ] **M3.1:** Counter-Campaign planner with doctrine checks live.
- [ ] **M3.2:** Analyst Workbench (ChatOps) fully integrated.
- [ ] **M3.3:** Full "Red Team" simulation capability.

### Concrete PR Rails

#### 1. Schema & Data Layer
- **PR 3.1: Counter-Ops Schema**
    - **Files:** `server/src/graphql/schema/cognitive-security.graphql`
    - **Changes:** Add `CounterCampaign`, `DoctrineRule`, `PolicyConstraint`.

#### 2. Logic & Planning
- **PR 3.2: Counter-Campaign Proposer (AI)**
    - **Files:** `server/src/services/planning/`
    - **Function:** Generate `CounterNarrative` options based on objectives and `DoctrineRule`s.
- **PR 3.3: Doctrine Compliance Engine**
    - **Function:** Validate proposed campaigns against policy constraints.

#### 3. Frontend & UX
- **PR 3.4: Analyst Workbench / Battle Room**
    - **Files:** `client/src/pages/Workbench/`
    - **UI:** Integrated view for drafting, simulating, and launching campaigns.
- **PR 3.5: Intel ChatOps Integration**
    - **UI:** Chat interface for querying the system and tasking OSINT swarms.
