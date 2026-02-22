# Topicality Stack Roadmap

## Maturity Assessment


| Component | Maturity | Justification |
|-----------|----------|---------------|
| **Summit** | **DIFFERENTIATOR** | Mature `apps/web` with complex UI (TriPane, MaestroConsole) and solid `server` integration. It is the operational core. |
| **IntelGraph** | **FOUNDATION** | Stable graph logic in `server/src/graph` and `intelgraph/`. Provides the critical data layer for the stack. |
| **Maestro** | **DIFFERENTIATOR** | Active development in `server/src/maestro`. Core runtime for agents, but governance features are still evolving. |
| **Koshchei** | **DIFFERENTIATOR** | Narrative simulation engine (`server/src/narrative/`) now integrated with Neo4j graph hydration and MCP tool exposure. Production-ready for predictive analysis. |
| **Switchboard** | **DIFFERENTIATOR** | `apps/switchboard-web` now provides HITL review console with task approval/rejection and context detail views. |
| **companyOS** | **FOUNDATION** | `companyos/src` provides the identity/policy fabric (Identity, AuthZ), essential for governance but needs tighter integration. |
 HEAD
| Component       | Maturity           | Justification                                                                                                                  |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Summit**      | **DIFFERENTIATOR** | Mature `apps/web` with complex UI (TriPane, MaestroConsole) and solid `server` integration. It is the operational core.        |
| **IntelGraph**  | **FOUNDATION**     | Stable graph logic in `server/src/graph` and `intelgraph/`. Provides the critical data layer for the stack.                    |
| **Maestro**     | **DIFFERENTIATOR** | Active development in `server/src/maestro`. Core runtime for agents, but governance features are still evolving.               |
| **Koshchei**    | **EXPERIMENT**     | Simulation engine (`server/src/narrative/engine.ts`) exists as a prototype but is not fully integrated with the graph or UI.   |
| **Switchboard** | **EXPERIMENT**     | `apps/switchboard-web` is currently a shell/adapter view. Needs significant work to become a HITL review console.              |
| **companyOS**   | **FOUNDATION**     | `companyos/src` provides the identity/policy fabric (Identity, AuthZ), essential for governance but needs tighter integration. |
 origin/main

---

## STRATEGIC INITIATIVES
*   **Narrative Operations 2.0** – A 90-day plan to evolve Summit into a full cognitive warfare stack. See [Narrative Operations 2.0 Plan](docs/NARRATIVE_OPS_2_0_PLAN.md).
*   **IntelGraph Master Orchestration Plan** – A 220-task parallel execution roadmap for platform maturity. See [Master Orchestration Plan](docs/plans/orchestration/MASTER_ORCHESTRATION_PLAN.md).

## ROADMAP OVERVIEW

### H1 (0–6 weeks): Governance & Human Oversight

- **[Epic 1] "Glass Box" Agent Governance** – Enforce policy-as-code gates and immutable audit logs for all agent actions.
- **[Epic 2] Switchboard V1: Human-in-the-Loop Console** – A dedicated UI for human operators to review, approve, or reject high-risk agent tasks.

### H2 (6–16 weeks): Narrative Intelligence Integration

- **[Epic 3] Graph-Hydrated Narrative Simulation** – Connect the Koshchei simulation engine to live IntelGraph data for real-world modeling.
- **[Epic 4] Narrative Arc Visualization** – Visual tools in Summit to track and forecast narrative momentum and sentiment shifts over time.

### H3 (4–9 months): Autonomous Operations

- **[Epic 5] Autonomous "Red Team" Agents** – Agents that proactively plan and execute simulated adversarial campaigns to test defenses.
- **[Epic 6] Federated Agent Protocols** – Standardized communication allowing third-party agents to safely participate in the Summit ecosystem.

---

## EPIC DETAILS

## [Epic 1] "Glass Box" Agent Governance

- **Type:** FOUNDATION
- **Horizon:** H1
- **User & Problem:** Security Engineers need to trust that agents won't take dangerous or unauthorized actions. Currently, agent logic is opaque.
- **Value:** Provides mathematically verifiable proof of agent compliance and creates a safety layer that prevents "rogue" agent behavior.
- **How this supports:**
  - **Agent governance:** Enforces "Agent governance and auditability" (Priority #1) via OPA policies and provenence logging.
- **Dependencies:** `companyOS` (Policy Engine), `ProvenanceLedger` (Audit), `Maestro` (Runtime).
- **Risks & mitigations:**
  - _Risk:_ Governance checks add too much latency. _Mitigation:_ Cache compiled OPA policies; use async audit logging.
  - _Risk:_ Policies become too complex to manage. _Mitigation:_ Use "Policy Tiers" (Low/Medium/High risk) rather than per-agent rules.

### STORIES

#### Story 1.1: Governance Policy Middleware

- **Description:** Implement a middleware in `MaestroService` that intercepts every agent action request. It must query `companyOS` (or local OPA) to validate the action against the agent's permissions before execution.
- **Acceptance Criteria:**
  - [ ] Middleware intercepts `executeTask` calls in Maestro.
  - [ ] Queries OPA with `input: { agentId, action, target }`.
  - [ ] Blocks execution if policy returns `deny`.
  - [ ] Returns 403 Forbidden with specific policy violation message.
- **Labels:** `product:maestro`, `area:security`, `type:feature`, `estimate:5d`, `priority:p0`

#### Story 1.2: Immutable Governance Logging

- **Description:** Integrate `ProvenanceLedger` to record every governance decision. Both "Allowed" and "Denied" attempts must be logged with a cryptographic signature.
- **Acceptance Criteria:**
  - [ ] `AgentGovernanceService` calls `ledger.appendEntry()` for every decision.
  - [ ] Log entry includes: `agentId`, `action`, `decision`, `policyHash`, `timestamp`.
  - [ ] Verify logs are persisted to PostgreSQL `provenance_ledger` table.
- **Labels:** `product:companyos`, `area:audit`, `type:backend`, `estimate:3d`, `priority:p0`

#### Story 1.3: "Approval Required" State Handling

- **Description:** Update the Maestro state machine to support a `PENDING_APPROVAL` state. If a policy returns `allow_with_approval`, the task must pause and wait for human intervention.
- **Acceptance Criteria:**
  - [ ] Add `PENDING_APPROVAL` to `TaskStatus` enum.
  - [ ] Maestro engine suspends execution when this state is reached.
  - [ ] Task persists in DB with `required_approval_role` metadata.
- **Labels:** `product:maestro`, `area:workflow`, `type:feature`, `estimate:5d`, `priority:p1`

---

## [Epic 2] Switchboard V1: Human-in-the-Loop Console

- **Type:** DIFFERENTIATOR
- **Horizon:** H1
- **User & Problem:** Ops Teams have no way to see or act on tasks stuck in `PENDING_APPROVAL`. They need a "feed" of decisions to make.
- **Value:** Unblocks the "Approval Required" workflow, enabling safe deployment of powerful agents by keeping humans in control.
- **How this supports:**
  - **Orchestration / “AI employee” runtime:** Provides the "manager" interface for AI employees.
- **Dependencies:** Epic 1 (for `PENDING_APPROVAL` tasks), `apps/switchboard-web` (Skeleton).
- **Risks & mitigations:**
  - _Risk:_ UI becomes cluttered with low-value approvals. _Mitigation:_ Batch approval capabilities and smart filtering by urgency.

### STORIES

#### Story 2.1: Switchboard Task Feed

- **Description:** Create a "Task Inbox" in `apps/switchboard-web`. It should fetch all tasks with status `PENDING_APPROVAL` from the Maestro API.
- **Acceptance Criteria:**
  - [ ] List view displaying: Agent Name, Action Type, Risk Score, Created At.
  - [ ] Sortable by Risk Score (Desc) and Time (Asc).
  - [ ] Auto-refresh every 30 seconds.
- **Labels:** `product:switchboard`, `area:frontend`, `type:feature`, `estimate:5d`, `priority:p1`

#### Story 2.2: Task Approval/Rejection Actions

- **Description:** Implement "Approve" and "Reject" buttons for selected tasks. Approving resumes the Maestro task; rejecting cancels it.
- **Acceptance Criteria:**
  - [ ] "Approve" calls `POST /api/maestro/tasks/:id/approve`.
  - [ ] "Reject" prompts for a reason, then calls `POST /api/maestro/tasks/:id/reject`.
  - [ ] UI updates optimistically to remove handled tasks.
- **Labels:** `product:switchboard`, `area:frontend`, `type:feature`, `estimate:3d`, `priority:p1`

#### Story 2.3: Task Context Detail View

- **Description:** A detailed view for a selected task showing _why_ it flagged for review. Display the OPA policy result and the diff/parameters of the proposed action.
- **Acceptance Criteria:**
  - [ ] Show "Policy Reason" (e.g., "Cost > $100").
  - [ ] Show JSON diff of the proposed operation (e.g., entity changes).
  - [ ] Link to the Agent's profile page.
- **Labels:** `product:switchboard`, `area:ux`, `type:enhancement`, `estimate:5d`, `priority:p2`

---

## [Epic 3] Graph-Hydrated Narrative Simulation

- **Type:** DIFFERENTIATOR
- **Horizon:** H2
- **User & Problem:** Intelligence Analysts use `Koshchei` simulations, but manually creating entities is tedious. They need to run sims on _real_ data.
- **Value:** Transforms Koshchei from a toy into a production-grade predictive tool for real-world campaigns.
- **How this supports:**
  - **Narrative intelligence over graphs:** Directly links the graph store (IntelGraph) to narrative modeling (Koshchei).
- **Dependencies:** `IntelGraph` (Neo4j data), `Koshchei` (Narrative Engine).
- **Risks & mitigations:**
  - _Risk:_ Importing full graphs crashes the sim. _Mitigation:_ Implement "Ego Graph" loading (Node + N hops) or subgraph selection filters.

### STORIES


#### Story 3.1: Neo4j Entity Loader for Narrative Engine [DONE]
*   **Description:** Create an adapter in `server/src/narrative/adapters/neo4j-loader.ts` that fetches entities and relationships from Neo4j and converts them into `SimulationEntity` types.
*   **Acceptance Criteria:**
    *   [x] Function `loadFromGraph(rootId: string, depth: number)` returns `SimulationEntity[]`.
    *   [x] Maps Neo4j labels (e.g., `Person`, `Topic`) to Simulation types.
    *   [x] Maps Neo4j relationships (e.g., `SUPPORTS`) to Simulation edges with weights.
*   **Labels:** `product:koshchei`, `area:backend`, `type:integration`, `estimate:5d`, `priority:p2`
#### Story 3.2: Simulation Configuration UI - Graph Selector [DONE]
*   **Description:** Update the Simulation Setup UI in Summit to allow users to pick a "Root Entity" from IntelGraph instead of typing manual JSON.
    *   [x] Entity Search Autocomplete (connected to IntelGraph Search).
    *   [x] "Depth" slider (1-3 hops).
    *   [x] "Import" button that populates the simulation state.
*   **Labels:** `product:summit`, `area:frontend`, `type:feature`, `estimate:5d`, `priority:p2`
#### Story 3.3: Dynamic Attribute Mapping [DONE]
*   **Description:** The graph data might lack "Sentiment" or "Resilience" scores. Implement a heuristic mapper that assigns default simulation values based on Graph node properties (e.g., PageRank = Influence).
    *   [x] Map `PageRank` score -> `Influence` (0-1).
    *   [x] Map `Betweenness` -> `Connectivity`.
    *   [x] Allow users to override these defaults in the config.
*   **Labels:** `product:koshchei`, `area:datascience`, `type:algorithm`, `estimate:5d`, `priority:p3`
 HEAD
#### Story 3.1: Neo4j Entity Loader for Narrative Engine
- **Description:** Create an adapter in `server/src/narrative/adapters/neo4j-loader.ts` that fetches entities and relationships from Neo4j and converts them into `SimulationEntity` types.
- **Acceptance Criteria:**
  - [ ] Function `loadFromGraph(rootId: string, depth: number)` returns `SimulationEntity[]`.
  - [ ] Maps Neo4j labels (e.g., `Person`, `Topic`) to Simulation types.
  - [ ] Maps Neo4j relationships (e.g., `SUPPORTS`) to Simulation edges with weights.
- **Labels:** `product:koshchei`, `area:backend`, `type:integration`, `estimate:5d`, `priority:p2`
#### Story 3.2: Simulation Configuration UI - Graph Selector
- **Description:** Update the Simulation Setup UI in Summit to allow users to pick a "Root Entity" from IntelGraph instead of typing manual JSON.
  - [ ] Entity Search Autocomplete (connected to IntelGraph Search).
  - [ ] "Depth" slider (1-3 hops).
  - [ ] "Import" button that populates the simulation state.
- **Labels:** `product:summit`, `area:frontend`, `type:feature`, `estimate:5d`, `priority:p2`
#### Story 3.3: Dynamic Attribute Mapping
- **Description:** The graph data might lack "Sentiment" or "Resilience" scores. Implement a heuristic mapper that assigns default simulation values based on Graph node properties (e.g., PageRank = Influence).
  - [ ] Map `PageRank` score -> `Influence` (0-1).
  - [ ] Map `Betweenness` -> `Connectivity`.
  - [ ] Allow users to override these defaults in the config.
- **Labels:** `product:koshchei`, `area:datascience`, `type:algorithm`, `estimate:5d`, `priority:p3`
 origin/main

---

## [Epic 4] Narrative Arc Visualization

- **Type:** DIFFERENTIATOR
- **Horizon:** H2
- **User & Problem:** Analysts can't see the "forest for the trees" in raw logs. They need to see how a narrative theme rises and falls over time.
- **Value:** Provides "at-a-glance" situational awareness of information campaigns.
- **How this supports:**
  - **Narrative intelligence:** visualizing abstract narrative constructs.
- **Dependencies:** `server/src/narrative` (Engine outputs).
- **Risks & mitigations:**
  - _Risk:_ Too many overlapping arcs make the chart unreadable. _Mitigation:_ interactive filtering and "focus" mode for single themes.

### STORIES


#### Story 4.1: Narrative Arc Data API [DONE]
*   **Description:** Expose a new GraphQL/REST endpoint that returns time-series data for Story Arcs from a simulation run.
*   **Acceptance Criteria:**
    *   [x] `GET /api/narrative/:simId/arcs`.
    *   [x] Returns JSON: `[{ tick: 0, theme: "Fear", momentum: 0.5 }, ...]`.
    *   [x] Cached for performance on finished simulations.
*   **Labels:** `product:summit`, `area:api`, `type:backend`, `estimate:3d`, `priority:p2`
#### Story 4.2: Momentum Chart Component [DONE]
*   **Description:** Build a Recharts multi-line chart component in `apps/web` to visualize the Arc data.
    *   [x] X-Axis: Time/Ticks. Y-Axis: Momentum (0-1).
    *   [x] Distinct colors per Theme.
    *   [x] Tooltip showing "Top Contributing Entities" at that timestamp.
*   **Labels:** `product:summit`, `area:frontend`, `type:feature`, `estimate:5d`, `priority:p2`
#### Story 4.3: Arc "Key Moments" Annotations [DONE]
*   **Description:** Overlay "Intervention Events" (e.g., Agent Actions) on the timeline to show cause-and-effect.
    *   [x] API includes `events[]` with timestamps.
    *   [x] Chart renders vertical markers for significant events.
    *   [x] Clicking a marker shows the Event details in a side panel.
*   **Labels:** `product:summit`, `area:ux`, `type:enhancement`, `estimate:3d`, `priority:p3`
 HEAD
#### Story 4.1: Narrative Arc Data API
- **Description:** Expose a new GraphQL/REST endpoint that returns time-series data for Story Arcs from a simulation run.
- **Acceptance Criteria:**
  - [ ] `GET /api/narrative/:simId/arcs`.
  - [ ] Returns JSON: `[{ tick: 0, theme: "Fear", momentum: 0.5 }, ...]`.
  - [ ] Cached for performance on finished simulations.
- **Labels:** `product:summit`, `area:api`, `type:backend`, `estimate:3d`, `priority:p2`
#### Story 4.2: Momentum Chart Component
- **Description:** Build a Recharts multi-line chart component in `apps/web` to visualize the Arc data.
  - [ ] X-Axis: Time/Ticks. Y-Axis: Momentum (0-1).
  - [ ] Distinct colors per Theme.
  - [ ] Tooltip showing "Top Contributing Entities" at that timestamp.
- **Labels:** `product:summit`, `area:frontend`, `type:feature`, `estimate:5d`, `priority:p2`
#### Story 4.3: Arc "Key Moments" Annotations
- **Description:** Overlay "Intervention Events" (e.g., Agent Actions) on the timeline to show cause-and-effect.
  - [ ] API includes `events[]` with timestamps.
  - [ ] Chart renders vertical markers for significant events.
  - [ ] Clicking a marker shows the Event details in a side panel.
- **Labels:** `product:summit`, `area:ux`, `type:enhancement`, `estimate:3d`, `priority:p3`
 origin/main

---

## [Epic 5] Autonomous "Red Team" Agents

- **Type:** EXPERIMENT
- **Horizon:** H3
- **User & Problem:** Testing defenses manually is slow. Security teams need "adversaries" that sleep, wake up, and try to manipulate the narrative graph 24/7.
- **Value:** continuous validation of information defenses; "Pentesting for Influence Operations".
- **How this supports:**
  - **Agentic AI for cybersecurity:** Autonomous adversarial modeling.
- **Dependencies:** Stable Koshchei (H2), Maestro (H1).
- **Risks & mitigations:**
  - _Risk:_ Runaway agents spamming the system. _Mitigation:_ Strict "sandbox" mode (simulation only) and budget caps (H1 Governance).

### STORIES


#### Story 5.1: "Simulation Runner" Agent Capability [DONE]
*   **Description:** Give Maestro Agents the tool/capability to start, step, and analyze a Koshchei simulation programmatically.
*   **Acceptance Criteria:**
    *   [x] Tool `run_simulation(config_id)` available to Agents (Implemented as `narrative.simulate`).
    *   [x] Tool `get_simulation_state(sim_id)` returns structured JSON (Implemented as `narrative.get_state`).
    *   [x] Tool `inject_event(sim_id, event)` allows agent participation (Implemented as `narrative.inject`).
*   **Labels:** `product:maestro`, `area:ai`, `type:feature`, `estimate:8d`, `priority:p3`
 HEAD
#### Story 5.1: "Simulation Runner" Agent Capability
- **Description:** Give Maestro Agents the tool/capability to start, step, and analyze a Koshchei simulation programmatically.
- **Acceptance Criteria:**
  - [ ] Tool `run_simulation(config_id)` available to Agents.
  - [ ] Tool `get_simulation_state(sim_id)` returns structured JSON.
  - [ ] Tool `inject_event(sim_id, event)` allows agent participation.
- **Labels:** `product:maestro`, `area:ai`, `type:feature`, `estimate:8d`, `priority:p3`
 origin/main

#### Story 5.2: Goal-Directed Planner (Adversarial)

- **Description:** Create a specialized "Red Team" prompt/planner that optimizes for a specific graph metric (e.g., "Maximize 'Panic' theme momentum").
- **Acceptance Criteria:**
  - [ ] Agent loop: Observation -> Prediction (via Sim) -> Action.
  - [ ] Defined "Win Condition" (e.g., Momentum > 0.8).
  - [ ] Agent terminates when goal is reached or budget exhausted.
- **Labels:** `product:maestro`, `area:ai`, `type:experiment`, `estimate:10d`, `priority:p4`

#### Story 5.3: Automated "After Action" Report

- **Description:** When a Red Team agent finishes, it should generate a summary explaining its strategy and success/failure.
- **Acceptance Criteria:**
  - [ ] Generates Markdown report.
  - [ ] Includes: "Steps taken", "Resources used", "Outcome".
  - [ ] Saves report to `ProvenanceLedger` as an Artifact.
- **Labels:** `product:companyos`, `area:reporting`, `type:feature`, `estimate:3d`, `priority:p3`

---

## [Epic 6] Federated Agent Protocols

- **Type:** FOUNDATION
- **Horizon:** H3
- **User & Problem:** Enterprises have existing investments in LangChain/LlamaIndex agents. They want to use Summit's governance without rewriting their agents.
- **Value:** Unlocks ecosystem compatibility, allowing "Bring Your Own Agent" while maintaining security guarantees.
- **How this supports:**
  - **Compatibility:** explicitly addresses compatibility with common frameworks (Priority #4).
- **Dependencies:** `Maestro` (API Stability), `companyOS` (Identity).
- **Risks & mitigations:**
  - _Risk:_ Protocol bloat. _Mitigation:_ Adhere to simple, standard JSON-RPC or MCP (Model Context Protocol) standards.

### Standard protocols: MCP and A2A

- **MCP (Model Context Protocol)** is emerging as a standard way for LLMs to access tools and data with consistent auth, schemas, and context packaging.[nojitter]
- **A2A (Agent2Agent Protocol)** provides a standardized framework for inter-agent collaboration and negotiation, which maps cleanly onto Summit’s cross-agent routing and arbitration needs.[nojitter]
- **Action for Summit:**
  - Implement MCP-compatible tool servers and clients in the Summit stack as a first-class integration mode.[nojitter]
  - Define an internal A2A-style schema for inter-agent messages (roles, intents, capabilities, and negotiation outcomes) so orchestration remains portable as these protocols harden.[nojitter]
  - Keep execution momentum strong through the 23rd order of imputed intention to align orchestration intent with governance cadence.[nojitter]

### STORIES


#### Story 6.1: Model Context Protocol (MCP) Server Support [DONE]
*   **Description:** Implement an MCP-compliant server interface for Summit. This allows any MCP client (Claude, IDEs, external agents) to discover and call Summit tools/resources.
*   **Acceptance Criteria:**
    *   [x] `server/src/maestro/mcp/` module handles MCP handshake.
    *   [x] Exposes `IntelGraph` search as an MCP Resource (Implemented via `graphops` server).
    *   [x] Exposes `Koshchei` simulation as an MCP Tool (Implemented via `narrative` server).
*   **Labels:** `product:maestro`, `area:interop`, `type:feature`, `estimate:10d`, `priority:p3`
 HEAD
#### Story 6.1: Model Context Protocol (MCP) Server Support
- **Description:** Implement an MCP-compliant server interface for Summit. This allows any MCP client (Claude, IDEs, external agents) to discover and call Summit tools/resources.
- **Acceptance Criteria:**
  - [ ] `server/src/maestro/mcp/` module handles MCP handshake.
  - [ ] Exposes `IntelGraph` search as an MCP Resource.
  - [ ] Exposes `Koshchei` simulation as an MCP Tool.
- **Labels:** `product:maestro`, `area:interop`, `type:feature`, `estimate:10d`, `priority:p3`
 origin/main

#### Story 6.2: LangChain "SummitGovernance" CallbackHandler

- **Description:** Create a Python/JS library that third-party LangChain agents can install. It intercepts tool calls and validates them against Summit's Policy API before execution.
- **Acceptance Criteria:**
  - [ ] `pip install summit-sdk`.
  - [ ] `SummitCallbackHandler` sends telemetry and policy checks to Summit API.
  - [ ] Blocks execution if Summit returns 403.
- **Labels:** `product:sdk`, `area:integration`, `type:library`, `estimate:5d`, `priority:p3`

#### Story 6.3: External Agent Registry

- **Description:** Allow registering an external agent (by URL/Identity) in companyOS.
- **Acceptance Criteria:**
  - [ ] UI: "Register External Agent".
  - [ ] Generates Client ID/Secret for the agent.
  - [ ] Assigns a "Service Account" role in OPA.
- **Labels:** `product:companyos`, `area:security`, `type:feature`, `estimate:3d`, `priority:p2`
