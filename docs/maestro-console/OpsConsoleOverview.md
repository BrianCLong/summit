# Maestro Conductor Ops Console

The Maestro Conductor Ops Console is the central "Control Room" for the IntelGraph platform. It provides a real-time window into the orchestration of AI agents, autonomous control loops, and delivery pipelines.

## Navigation

- **[Control Room Dashboard](./ControlRoomDashboard.md)**: Real-time system health, SLOs, and active alerts.
- **[Runs & Task Graphs](./RunsAndGraphsUI.md)**: Deep dive into agent execution traces and task dependencies.
- **[Agents & Models](./AgentsAndModels.md)**: Fleet management for AI agents (Planner, Coder, Reviewer).
- **[Autonomic & SLOs](./AutonomicAndSLOsUI.md)**: Control center for self-healing loops and budget enforcement.
- **[Merge Trains](./MergeTrainsUI.md)**: Visualization of the CI/CD merge queue and train status.
- **[Experiments & Playbooks](./ExperimentsAndPlaybooksUI.md)**: A/B testing workbench and operational playbooks.
- **[Policy & Governance](./GovernanceAndAuditUI.md)**: Audit logs and OPA policy inspection.

## Access & RBAC

Access is controlled via Role-Based Access Control (RBAC). See [RBAC & Access](./RBACAndAccess.md) for details on `Viewer`, `Operator`, and `Admin` roles.

## Architecture

The console is built with React, TypeScript, and Material UI, communicating with the Maestro Backend via REST APIs.

### Backend Services
- `MaestroService`: Aggregates health, stats, and control loop logic.
- `RunsRepo`: Manages persistence of execution traces in PostgreSQL.
- `AuditLogger`: Records all mutations for governance.

### Frontend
- Located in `conductor-ui/frontend`.
- Entry point: `/maestro`.
- Uses `Recharts` for visualization and `Material UI` for components.
