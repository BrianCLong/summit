# Summit Cognitive Command Center — Master Architecture & Execution Plan

## 1. Overview
The **Summit Cognitive Command Center** is the strategic control layer sitting above the Summit War Room and Intelligence OS. It provides operators a comprehensive environment for strategic foresight, world-state monitoring, narrative battlespace analysis, intervention planning, and agent oversight.

## 2. Directory Structure & File Map
The module is housed in `summit/ui/cognitive-command/` and follows existing Summit repository patterns.

```
summit/ui/cognitive-command/
├── CognitiveCommandApp.tsx       (Main Entry)
├── CognitiveCommandLayout.tsx
├── CognitiveCommandShell.tsx
├── GlobalMissionRail.tsx
├── StrategicStatusBar.tsx
├── CognitiveWorkspace.tsx
├── CognitivePanelHost.tsx
├── adapters/                     (API Bindings mapping to Backend Contracts)
├── autonomy/                     (Agent Fleet Oversight)
├── command/                      (Operator Command Palette)
├── decision-sim/                 (Intervention & Simulation Workbench)
├── foresight/                    (Strategic Forecasting)
├── governance/                   (Policy & Forecast Gates)
├── insight-feed/                 (System-wide Alerts)
├── missions/                     (Command Dashboards)
├── narrative-battlespace/        (Influence Mapping)
├── schemas/                      (Draft-07 JSON Schemas)
├── __tests__/                    (Vitest validations)
├── e2e/                          (Playwright tests)
└── types.ts                      (Core Interfaces)
```

## 3. Data Contracts and Schema Integration
The UI maps to existing and assumed backend contracts across multiple Summit engines:
- **IntelGraph / Investigation Memory:** Provides entities, relationships, and insight traces.
- **Agent Systems (Maestro/Koshchei):** Drives autonomy/agent oversight panels.
- **Narrative Intelligence:** Powers the Narrative Battlespace.
- **CWMI / VTII / Evolution Intelligence:** Drives the strategic foresight and world model projections.
- **RepoOS Governance:** Backs the strategic governance gates.

*Note: All schemas and Typescript interfaces are defined in `schemas/` and `types.ts`.*

## 4. 10-PR Implementation Stack

### PR 1: Schema, Types, and Adapter Foundations (Completed)
- **Scope:** Define JSON schemas, TypeScript interfaces, and deterministic stub adapters for all core entities (Forecast, World State, Narrative, Interventions, Mission, Autonomy, Governance, Insights).
- **Files:** `schemas/*.json`, `types.ts`, `adapters/*.ts`, `__tests__/schemas.test.ts`.
- **Dependencies:** None.
- **CI Gates:** Schema validation using `ajv`, Typecheck.

### PR 2: Cognitive Command Shell and Workspace Layout
- **Scope:** Build the base multi-panel workspace shell (`CognitiveCommandApp.tsx`, `CognitiveCommandLayout.tsx`, `CognitiveWorkspace.tsx`) with keyboard navigation and resizable panes.
- **Dependencies:** PR 1.
- **CI Gates:** Component render tests.

### PR 3: Strategic Foresight Dashboards
- **Scope:** Implement the foresight visualizations (`StrategicForesightDashboard.tsx`, `ForecastOverview.tsx`, `ProbabilityShiftPanel.tsx`) using dummy adapter data to show trajectories and confidence bands.
- **Dependencies:** PR 2.
- **CI Gates:** Visual smoke tests.

### PR 4: World Model Operations UI
- **Scope:** Build out the system dynamics and state transition explorer (`WorldStateMap.tsx`, `SystemDynamicsView.tsx`) to display rolling world-state and analogs.
- **Dependencies:** PR 2.

### PR 5: Narrative Battlespace Map
- **Scope:** Visualize competing narratives and influence flows (`NarrativeBattlespaceMap.tsx`, `InfluenceFlowGraph.tsx`) using the design system extensions.
- **Dependencies:** PR 2.

### PR 6: Decision Simulation Interfaces
- **Scope:** Create the intervention workbench (`DecisionWorkbench.tsx`, `InterventionPlanner.tsx`) for comparing outcomes and mapping second-order effects.
- **Dependencies:** PR 2.

### PR 7: Autonomous Investigation Oversight
- **Scope:** Add agent fleet monitoring and human approval gates (`AutonomySupervisor.tsx`, `AgentFleetBoard.tsx`, `HumanApprovalGate.tsx`).
- **Dependencies:** PR 2.

### PR 8: Mission Command Dashboards & Insight Feed
- **Scope:** Unify mission status and systemwide insights (`MissionCommandCenter.tsx`, `CognitiveInsightFeed.tsx`).
- **Dependencies:** PR 2.

### PR 9: Strategic Governance + Release Gates
- **Scope:** Tie RepoOS policy and risk signals to strategic operations (`StrategicGovernancePanel.tsx`, `PolicyForecastGate.tsx`).
- **Dependencies:** PR 6, PR 7.

### PR 10: Command Palette and Final Polish
- **Scope:** Introduce the highest-power command interface (`CognitiveCommandPalette.tsx`), integrate real backend endpoints (replacing stub adapters), and finalize E2E testing (`e2e/cognitive-command.spec.ts`).
- **Dependencies:** PR 3-9.
- **CI Gates:** Full UI E2E, a11y checks.

## 5. Implementation Sequence & Minimal Vertical Slice
For a minimal viable release (Vertical Slice), we recommend completing **PR 1 (Data Layer)**, **PR 2 (Workspace Shell)**, and **PR 8 (Mission Command & Insights)**. This provides operators with immediate situational awareness of current missions and agent-generated insights, laying the foundation for advanced foresight and simulation modules later.
