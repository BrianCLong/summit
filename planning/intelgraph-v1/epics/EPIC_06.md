# EPIC 6 — Frontend & Analyst Experience

**Goal**: Build a high-performance React UI with real-time graph visualization and audit logs.

**Architecture Reference**:
```mermaid
graph TD\n    A[React App] --> B[Cytoscape Renderer]\n    B --> C[GraphQL Client]\n    C --> D[Socket.IO Sync]\n    D --> E[Audit Viewer]
```

**Constraints**: Align with Org Defaults (SLOs, Cost, Privacy).

### Risk Matrix
| Risk | Impact | Mitigation |
|---|---|---|
| Technical Debt | Medium | Regular refactoring blocks. |
| Resource Constraint | High | Parallel execution with modular agents. |

### Task: React Scaffold (Vite)
- **Description**: Implementation and validation of React Scaffold (Vite) for the IntelGraph platform.
- **Subtasks**:
  - Setup Vite + TS project
  - Implement folder structure
  - Configure ESLint/Prettier
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Architecture Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Project is clean and linted
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `pnpm lint`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Material-UI Design System
- **Description**: Implementation and validation of Material-UI Design System for the IntelGraph platform.
- **Subtasks**:
  - Implement theme provider
  - Setup component library
  - Verify visual consistency
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: UI Subagent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Design specs met
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check Storybook
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Cytoscape Graph Viewer
- **Description**: Implementation and validation of Cytoscape Graph Viewer for the IntelGraph platform.
- **Subtasks**:
  - Implement canvas renderer
  - Setup node/edge styles
  - Verify large graph perf
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Smooth 5k node render
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:graph-perf`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Incremental Graph Loading
- **Description**: Implementation and validation of Incremental Graph Loading for the IntelGraph platform.
- **Subtasks**:
  - Implement virtualization
  - Setup fetch-on-scroll
  - Verify loading states
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero UI freezing
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check network logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Realtime Updates
- **Description**: Implementation and validation of Realtime Updates for the IntelGraph platform.
- **Subtasks**:
  - Setup Socket.IO client
  - Implement event listeners
  - Verify sync behavior
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Real-time state sync
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run sync test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Query Builder UI
- **Description**: Implementation and validation of Query Builder UI for the IntelGraph platform.
- **Subtasks**:
  - Implement visual drag-and-drop
  - Setup filter logic
  - Verify query generation
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Complex queries built visually
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check query output
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Investigation Case View
- **Description**: Implementation and validation of Investigation Case View for the IntelGraph platform.
- **Subtasks**:
  - Implement case management UI
  - Setup note-taking hooks
  - Verify case saving
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Analyst workflow streamlined
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run case test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Evidence Timeline
- **Description**: Implementation and validation of Evidence Timeline for the IntelGraph platform.
- **Subtasks**:
  - Implement time-series chart
  - Setup event markers
  - Verify zoom/pan
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Observability Subagent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Clear temporal view
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check timeline UI
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Export Interface
- **Description**: Implementation and validation of Export Interface for the IntelGraph platform.
- **Subtasks**:
  - Implement CSV/PDF/JSON export
  - Setup file generation
  - Verify export integrity
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Exports are accurate
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check exported file
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Access Control UI
- **Description**: Implementation and validation of Access Control UI for the IntelGraph platform.
- **Subtasks**:
  - Implement RBAC manager
  - Setup user permissions view
  - Verify enforcement
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Permissions easy to manage
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run auth test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Dark/Light Mode
- **Description**: Implementation and validation of Dark/Light Mode for the IntelGraph platform.
- **Subtasks**:
  - Implement theme switching
  - Setup system preference hook
  - Verify accessibility
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: UI Subagent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - WCAG contrast met
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run a11y audit
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Error State UX
- **Description**: Implementation and validation of Error State UX for the IntelGraph platform.
- **Subtasks**:
  - Implement toast notifications
  - Setup 404/500 pages
  - Verify recovery hints
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: UI Subagent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Errors are helpful
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Simulate error
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Performance Instrumentation
- **Description**: Implementation and validation of Performance Instrumentation for the IntelGraph platform.
- **Subtasks**:
  - Setup Web Vitals tracking
  - Implement sentry/rum
  - Verify latency reporting
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - LCP < 2.5s
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check Sentry dashboard
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: WebAuthn Integration
- **Description**: Implementation and validation of WebAuthn Integration for the IntelGraph platform.
- **Subtasks**:
  - Implement FIDO2/Passkey UI
  - Setup MFA flow
  - Verify secure login
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Passkeys work for login
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run login test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Audit Log Viewer
- **Description**: Implementation and validation of Audit Log Viewer for the IntelGraph platform.
- **Subtasks**:
  - Implement searchable log table
  - Setup filtering by user/action
  - Verify data integrity
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Audits are transparent
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check audit UI
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Role Management Interface
- **Description**: Implementation and validation of Role Management Interface for the IntelGraph platform.
- **Subtasks**:
  - Implement CRUD for roles
  - Setup permission mapping
  - Verify RBAC update
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Roles correctly mapped
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check RBAC logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Notification System
- **Description**: Implementation and validation of Notification System for the IntelGraph platform.
- **Subtasks**:
  - Implement real-time alerts
  - Setup email/slack preferences
  - Verify delivery
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Users notified instantly
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check notifications
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Multi-tenant Switcher
- **Description**: Implementation and validation of Multi-tenant Switcher for the IntelGraph platform.
- **Subtasks**:
  - Implement organization dropdown
  - Setup context switching
  - Verify data isolation
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Safe tenant switching
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run isolation test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Task: Accessibility Compliance
- **Description**: Implementation and validation of Accessibility Compliance for the IntelGraph platform.
- **Subtasks**:
  - Implement ARIA labels
  - Setup keyboard navigation
  - Verify screen reader
- **Assigned Agent**:
  - Primary: Frontend Agent
  - Optional Subagents: UI Subagent
- **Dependencies**: Epic 6 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - WCAG 2.1 AA met
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `pa11y`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Frontend Policy.

### Parallelization Map
All tasks in this epic can run in parallel following the foundational architecture setup.

### Critical Path
Foundational ADR -> Core Implementation -> Policy Verification -> Go-Live.

### Rollback Strategy
Revert to previous stable tag; restore DB snapshots if schema change was involved.
