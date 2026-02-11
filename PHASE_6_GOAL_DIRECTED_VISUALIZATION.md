# Phase 6: Goal-Directed Agents & Cognitive Visualization

**Mission:** Empower users to visualize narrative momentum and deploy goal-seeking autonomous agents for proactive threat defense and information operations simulation.

## Backlog

### Epic: Narrative Arc Visualization
- [ ] **Task #113: Momentum Time-Series Data.**
    - Implement `SimulationAnalyticsService` to aggregate narrative momentum over time.
    - Create a GraphQL resolver for `simulationHistory`.
- [ ] **Task #114: Event Impact Visualization.**
    - Implement "Cause-and-Effect" annotations for simulation events.
    - Map event injections to shifts in narrative sentiment.

### Epic: Goal-Directed Adversarial Agents
- [ ] **Task #115: Objective-Aware Maestro.**
    - Enhance `Maestro` to support "Win Conditions" for autonomous runs.
    - Implement `GoalSeekingAgent` that iteratively injects events into Koshchei to reach a target narrative state.
- [ ] **Task #116: Automated After-Action Reporting (AAR).**
    - Generate structured summaries of agent performance against objectives.
    - Include budget utilization and time-to-goal metrics.

### Epic: MCP & Ecosystem Expansion
- [ ] **Task #117: IntelGraph Search MCP Server.**
    - Expose `GraphSearchService` via MCP to allow simulations to query the live graph during execution.
- [ ] **Task #118: SDK for External Agents.**
    - Create `summit-agent-sdk` to allow third-party developers to build Summit-compatible cognitive tools.

### Epic: Production Hardening
- [ ] **Task #119: Real-Data Integration Tests.**
    - Replace mocks in `simulation_runner.verify.ts` with real Neo4j/Postgres test containers or fixtures.
