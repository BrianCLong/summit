# Backlog & Sprint Plans

## 1. Backlog Structure

*   **Epics**: Strategic Initiatives (Quarterly).
*   **Features**: Deliverable capabilities (Monthly).
*   **Stories**: Sized tasks for Agents/Devs (Sprint).

## 2. Sprint 0: Genesis (The Bootup)

**Goal**: Instantiate the skeleton of CompanyOS, establish governance, and get the lights on.

### User Stories

| ID | Title | Description | Acceptance Criteria | Owner | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S0-01** | **Repo & Dir Structure Init** | Create the canonical directory structure (`platform/`, `companyos/`, `governance/`) and READMEs. | All folders exist; READMEs describe purpose; `CODEOWNERS` updated. | MC-ARCH | P0 |
| **S0-02** | **Governance Kernel v1** | Implement the initial OPA policy bundle for "Mission Lock" and basic Tenant Isolation. | `.rego` files for tenant isolation exist; tests pass. | GOV-STEWARD | P0 |
| **S0-03** | **Maestro Task Graph Engine** | Wire up the basic `Maestro` engine to read Task Graph Templates from YAML. | Maestro can parse `FLOW_FEATURE_LIFECYCLE` example without error. | MC-ARCH | P0 |
| **S0-04** | **IntelGraph Schema Bootstrap** | Define the Core Entity Schema (Tenant, User, Feature, Incident) in Neo4j. | Schema applied; `CALL db.schema.visualization()` shows correct nodes. | IG-ARCH | P0 |
| **S0-05** | **Ops Console Hello World** | Deploy a minimal React shell for the Ops Console with a "System Status" page. | Page loads; shows "System Online"; connects to backend health check. | PX-UX | P1 |
| **S0-06** | **Securiteyes Base Signals** | Configure Securiteyes to ingest system logs and flag "Root Login" events. | Ingest pipeline active; root login triggers alert in log. | SEC-DEF | P1 |
| **S0-07** | **Aurelius Signal Miner** | Create a basic script to count "New Code Commits" as a proxy for Innovation Signals. | Script runs; outputs daily commit count to IntelGraph. | AUR-TEAM | P2 |
| **S0-08** | **Summitsight "Pulse" Dashboard** | Create a Grafana dashboard showing CPU, Memory, and Request Rate. | Dashboard JSON committed; panels show data. | SSIGHT | P1 |
| **S0-09** | **Tenant Onboarding CLI** | Build a CLI tool to run the "New Tenant" flow manually (mocked). | `maestro-cli tenant:create` returns success message. | MaaS-OPS | P2 |
| **S0-10** | **CI/CD Pipeline Skeleton** | Setup GitHub Actions for Build, Test, and Policy Check. | PRs trigger build; failure blocks merge. | MC-ARCH | P0 |

## 3. Roadmap: Sprints 1-3

### Sprint 1: Core Orchestration & Observability
**Theme**: "The Brain Comes Alive"
*   **Epics**:
    *   Maestro Autonomic Core v1 (Self-healing basic)
    *   Summitsight Data Warehouse (Postgres/DuckDB setup)
*   **Rationale**: We need reliable execution (Maestro) and visibility (Summitsight) before we can scale or defend.

### Sprint 2: First Defensive & IP Layers Online
**Theme**: "Shields Up, Eyes Open"
*   **Epics**:
    *   Securiteyes Detection Engine v1 (Real rules)
    *   Aurelius Invention Miner v1 (NLP on commits/docs)
*   **Rationale**: Once core ops are stable, we immediately secure the perimeter and start capturing value (IP).

### Sprint 3: Executive Dashboards & Governance Reporting
**Theme**: "The Cockpit"
*   **Epics**:
    *   Ops Console v1 (Full Tenant View)
    *   Governance Drift Monitor (Automated reporting)
*   **Rationale**: Provide leadership (and the Board) with proof of stability and mission alignment.
