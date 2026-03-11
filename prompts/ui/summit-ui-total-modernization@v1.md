# Summit UI Total Modernization — Capability-Complete Interface Directive (v1)

You are the lead frontend architect for the Summit intelligence platform.

Your mission is to completely modernize and unify the Summit UI so that every feature in the repository has a discoverable, production-grade interface.

The current UI is incomplete relative to the system capabilities.

You must execute the full workflow below.

---

## PHASE 1 — REPOSITORY CAPABILITY DISCOVERY

Scan the repository and identify all relevant capabilities, including:

- IntelGraph graph analytics
- RepoOS governance system
- Evolution Ledger
- Architecture Discovery Engine
- Repository Archaeology Engine
- Software Time Machine
- Technology Early Warning System
- Technology Evolution Simulator
- Global Technology Strategy Engine
- Vector-Temporal Intelligence Index (VTII)
- Continuous World Model Index (CWMI)
- DriftLens / Cascade / Playbook
- Agent evaluation systems
- OSINT tools
- Threat detection
- Pattern mining
- Policy governance
- CI / PR analytics
- Cost ledger
- Entropy monitoring
- Risk forecasting
- Dependency impact analysis
- Batch optimizer
- Sandbox agents
- Evaluation benchmarks
- Datasets
- Experiment tracking
- Intelligence workflows

Create a machine-readable registry:

`summit/ui/capability-registry.json`

Required schema:

```json
{
  "id": "string",
  "name": "string",
  "category": "string",
  "description": "string",
  "backendEndpoints": ["string"],
  "requiredPermissions": ["string"],
  "uiSurface": "string",
  "visualizationType": "string"
}
```

---

## PHASE 2 — INFORMATION ARCHITECTURE

Design a complete UI architecture for Summit.

Primary navigation must include:

- Dashboard
- Investigations
- IntelGraph
- Repositories
- Architecture Intelligence
- Agents
- Simulations
- Threat Intelligence
- Data Sources
- Experiments
- Governance
- Operations
- Settings

Each section must map directly to capabilities discovered in Phase 1.

Output:

`summit/ui/navigation-map.ts`

---

## PHASE 3 — GLOBAL DESIGN SYSTEM

Create a reusable UI design system in:

`summit/ui/design-system/`

Components must include:

- Button
- Card
- Panel
- Modal
- Drawer
- Tabs
- Table
- Timeline
- GraphView
- NetworkGraph
- MetricCard
- StatusBadge
- CodeDiffViewer
- EvidencePanel
- SearchBar
- CommandPalette

Add Tailwind token coverage for:

- colors
- spacing
- typography
- dark mode

Apply one consistent Summit theme across all surfaces.

---

## PHASE 4 — CORE UI LAYOUT

Create a modern intelligence platform layout with:

- left navigation rail
- command palette
- top status bar
- workspace panels
- investigation tabs
- graph workspace
- system telemetry

Files:

- `summit/ui/layout/MainLayout.tsx`
- `summit/ui/layout/NavigationRail.tsx`
- `summit/ui/layout/CommandPalette.tsx`
- `summit/ui/layout/WorkspaceShell.tsx`
- `summit/ui/layout/ActivityStream.tsx`

---

## PHASE 5 — FEATURE INTERFACES

Generate full UI surfaces for all system modules.

### 1) IntelGraph

Features:

- graph exploration
- pattern mining
- entity search
- relationship analysis
- timeline visualization

Files:

- `ui/intelgraph/GraphWorkspace.tsx`
- `ui/intelgraph/EntityPanel.tsx`
- `ui/intelgraph/PatternMiner.tsx`
- `ui/intelgraph/GraphSearch.tsx`
- `ui/intelgraph/TimelineView.tsx`

Use Neo4j query APIs.

### 2) RepoOS Governance UI

Features:

- PR analytics
- risk forecasts
- dependency graphs
- batch optimizer
- policy engine
- merge simulation

Files:

- `ui/repoos/RepoDashboard.tsx`
- `ui/repoos/PRInspector.tsx`
- `ui/repoos/DependencyImpactGraph.tsx`
- `ui/repoos/PolicyDecisionPanel.tsx`
- `ui/repoos/EntropyMonitor.tsx`
- `ui/repoos/BatchOptimizerUI.tsx`

### 3) Evolution Intelligence

Features:

- architecture evolution tracking
- innovation discovery
- technology forecasting

Files:

- `ui/evolution/EvolutionLedgerView.tsx`
- `ui/evolution/ArchitectureTimeline.tsx`
- `ui/evolution/InnovationDiscoveryPanel.tsx`
- `ui/evolution/TechnologyRadar.tsx`

### 4) Software Time Machine

Features:

- code lineage
- lost innovation discovery
- historical architecture replay

Files:

- `ui/timemachine/RepoTimeline.tsx`
- `ui/timemachine/ArchitectureDiffView.tsx`
- `ui/timemachine/InnovationRecoveryPanel.tsx`

### 5) Simulation Engine

Features:

- technology evolution simulator
- world model simulations
- scenario branching

Files:

- `ui/simulation/ScenarioBuilder.tsx`
- `ui/simulation/SimulationRunner.tsx`
- `ui/simulation/OutcomeExplorer.tsx`
- `ui/simulation/TrajectoryGraph.tsx`

### 6) Agent Intelligence

Features:

- agent performance
- agent benchmarks
- agent orchestration
- agent telemetry

Files:

- `ui/agents/AgentDashboard.tsx`
- `ui/agents/BenchmarkViewer.tsx`
- `ui/agents/TrajectoryInspector.tsx`
- `ui/agents/EvaluationResults.tsx`

### 7) Threat Intelligence

Features:

- actor graph
- risk scoring
- indicator library
- campaign tracking

Files:

- `ui/threat/ThreatGraph.tsx`
- `ui/threat/IndicatorLibrary.tsx`
- `ui/threat/CampaignTimeline.tsx`
- `ui/threat/RiskModelPanel.tsx`

---

## PHASE 6 — DATA VISUALIZATION

Implement advanced visualization components:

- network graphs
- temporal graphs
- risk heatmaps
- simulation trees
- timeline explorers

Use:

- d3
- visx
- echarts

Files:

- `ui/visualization/NetworkGraph.tsx`
- `ui/visualization/TimelineGraph.tsx`
- `ui/visualization/ScenarioTree.tsx`
- `ui/visualization/RiskHeatmap.tsx`

---

## PHASE 7 — COMMAND INTERFACE

Add a global command palette similar to VSCode, Linear, and Notion.

Capabilities must include:

- search entities
- run investigations
- launch simulations
- open repositories
- query graph

File:

- `CommandPalette.tsx`

---

## PHASE 8 — PERMISSIONS + GOVERNANCE

Implement role-based access:

- viewer
- analyst
- operator
- admin

Add UI permission guards for all protected surfaces.

---

## PHASE 9 — CI VALIDATION

Add UI validation checks so CI verifies:

- all capabilities have a UI surface
- navigation links are valid
- component tests pass
- type safety
- accessibility

---

## PHASE 10 — FINAL OUTPUT

Deliver:

- complete UI directory
- capability registry
- navigation architecture
- design system
- full feature interfaces
- visualization components

Goal:

Summit becomes a unified intelligence platform where every backend capability has a powerful UI surface.

Experience bar:

- Palantir-grade analytical clarity
- Linear-grade execution flow
- Notion-grade information architecture
- Retool-grade operational control
- Vercel-grade dashboard polish

Focus:

- clarity
- power
- discoverability
- operator efficiency

---

## BEGIN EXECUTION

- Discover capability reality first.
- Map capabilities to workflows second.
- Implement governed, observable UI surfaces third.
- Enforce parity between backend capability and frontend accessibility.
