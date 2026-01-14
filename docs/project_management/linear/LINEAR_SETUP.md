# Summit Linear Setup Guide

This document defines the authoritative "Summit Linear" setup for the IntelGraph platform. It is optimized for a high-velocity, parallel-processing workflow involving both human engineers and AI agents.

## 1. Board Structure

### Backlog Hierarchy (3 Levels)

The backlog is organized into three distinct layers to manage strategy, tactics, and execution.

#### **Strategic Layer (Projects)**
*   **Purpose:** Major initiatives and releases (e.g., "Summit v4.0.0 GA Readiness").
*   **Alignment:** Map to quarterly or monthly business objectives.
*   **Status Tracking:** `Backlog` → `Planned` → `Started` → `Paused` → `Completed` → `Canceled`.
*   **Ownership:** Assign project leads and cross-functional members.

#### **Tactical Layer (Epics via Labels)**
*   **Purpose:** Feature groupings and thematic bundles.
*   **Naming Convention:** `epic-*`
*   **Examples:**
    *   `epic-ai-security`
    *   `epic-mcp-framework`
    *   `epic-osint-platform`
    *   `epic-agent-orchestration`

#### **Execution Layer (Issues)**
*   **Purpose:** Individual units of work.
*   **Granularity:** 1-2 day chunks, suitable for parallel agent execution.
*   **Linkage:** Must link to a parent Project and include at least one `epic-*` label.
*   **Criteria:** Clear acceptance criteria are mandatory.

### Workflow States

The workflow is optimized for agent-driven development, introducing specific states for AI handoffs.

| State | Type | Description |
| :--- | :--- | :--- |
| **Backlog** | `backlog` | Unprioritized items. |
| **Todo** | `unstarted` | Prioritized, ready for pickup. |
| **Agent Assigned** | `unstarted` | **NEW:** Assigned to an AI agent or session. |
| **In Progress** | `started` | Active work (Human or Agent). |
| **In Review** | `started` | PR under review. |
| **Blocked** | `started` | **NEW:** Waiting on external dependencies. |
| **Done** | `completed` | Merged and deployed. |
| **Canceled** | `canceled` | Won't do. |
| **Duplicate** | `canceled` | Duplicate work. |

## 2. Label Taxonomy

Consolidate all labels into these mutually exclusive categories.

### Priority
*   `prio:P0` - Critical (Immediate interrupt / Drop everything).
*   `prio:P1` - High (Current sprint/week).
*   `priority:ga` - GA blockers.
*   `priority:normal` - Standard priority.
*   `post-ga:migration` - Deferred post-launch items.

### Functional Area
*   `area:graph` - Core graph functionality.
*   `area:governance` - Governance and policy.
*   `area:ops` - Operations and SRE.
*   `area:resilience` - Resilience and DR.
*   `area:companyos` - CompanyOS platform.
*   `area:prov-ledger` - Provenance ledger.
*   `area:gtm` - Go-to-market.

### Lane (Work Stream)
*   `lane:platform` - Platform engineering.
*   `lane:frontend` - Frontend development.
*   `lane:gov-ops` - Governance operations.
*   `lane:bizdev` - Business development.

### Track (Parallel Workstreams)
*   `track:A` - Track A (e.g., Core Platform).
*   `track:B` - Track B (e.g., Features).
*   `track:E` - Track E (e.g., Experimental/Research).

### Type
*   `type:doc` - Documentation.
*   `type:doc-action` - Action item extracted from documentation.
*   `type:test` - Testing work.

### Process
*   `automated` - Ticket created by an agent or script.
*   `from-docs` - Extracted from documentation parsing.
*   `triage-needed` - Needs assignment or scoping.
*   `release-train` - Part of the release cadence.
*   `cadence:weekly` - Recurring weekly maintenance.

### Quality
*   `vulnerability` - Security issues.
*   `e2e-failure` - Test failures.
*   `gate` - Release gate/blocker.
*   `perf:strict` - Performance gate failure.

## 3. Backlog Grooming Flow

### Intake Process
1.  **Agent-Generated Tickets:** Automatically tagged with `automated` + source (e.g., `from-docs`, `owasp-zap`).
2.  **Triage Queue:** New tickets land here with `triage-needed` until assigned an `area:*` and `prio:*`.
3.  **Epic Assignment:** Link to relevant `epic-*` label.
4.  **Project Linkage:** Associate with active Linear Project.

### Prioritization Framework
1.  **P0 (Critical):** Immediate interrupt.
2.  **P1 (High):** Must ship in current iteration.
3.  **GA (Blocker):** Must ship before launch.
4.  **Normal:** Standard backlog.
5.  **Post-GA:** Deferred.

### Refinement Cadence
*   **Daily:** Triage `automated` tickets.
*   **Weekly:** Groom top 20 backlog items (apply `weekly-health` label).
*   **Bi-weekly:** Align project roadmap with stakeholders.

## 4. Roadmap Views

Configure these saved views in Linear for visibility.

### View 1: Release Train
*   **Filter:** `release-train` OR linked to current Release Project.
*   **Purpose:** Track GA readiness and blockers.
*   **Layout:** Status columns (Todo → Done).

### View 2: Track-Based Kanban
*   **Filter:** Group by `track:A`, `track:B`, `track:E`.
*   **Purpose:** Manage parallel agent sessions.
*   **Layout:** Status columns with swimlanes per track.

### View 3: Epic Roadmap
*   **Filter:** Group by `epic-*` labels.
*   **Purpose:** Feature-level progress.
*   **Layout:** Timeline or Board.

### View 4: Area Ownership
*   **Filter:** Group by `area:*` labels.
*   **Purpose:** Functional domain capacity planning.
*   **Layout:** Assignee breakdown.

### View 5: Priority Triage
*   **Filter:** `triage-needed` OR `prio:P0` OR `prio:P1`.
*   **Purpose:** Daily standup focus.
*   **Sort:** Priority (desc), then Created Date.

## 5. Agent Integration Patterns

### Automated Creation
*   **Security Scans:** Tag `vulnerability` + `owasp-zap` + `automated`.
*   **Doc Actions:** Tag `from-docs` + `type:doc-action` + `automated`.
*   **Test Failures:** Tag `e2e-failure` + `automated`.
*   **Perf Gates:** Tag `perf:strict` + `gate`.

### Velocity Tracking
*   **Estimation:** Use Fibonacci (1, 2, 3, 5, 8).
*   **Agent Attribution:** Track agent vs. human completion in a custom field.
*   **Cycle Time:** Monitor `Agent Assigned` → `In Review`.

### Dependencies
*   Use Linear's "Blocking" / "Blocked By" relationships explicitly.
*   Move blocked issues to **Blocked** status immediately.

## 6. Cycles Configuration

**Weekly Sprints (Mon-Fri)**
*   5-day iterations to align with high velocity.
*   Agent work spans multiple parallel sessions within the sprint.
*   **Friday:** Demo + Retro + Planning.

*(Alternative: Bi-weekly for complex features with external dependencies)*

## 7. Key Metrics Dashboard

Monitor these metrics via n8n or custom dashboards:
*   **Velocity:** Points completed per week.
*   **Lead Time:** Time from `Todo` → `Done`.
*   **WIP:** Count of `In Progress` + `In Review`.
*   **Blocked Count:** Issues in `Blocked` status.
*   **Automated vs. Manual:** Ratio of ticket creation.
*   **P0/P1 Age:** Time-to-resolution for critical items.

## 8. Tool Integration

### GitHub
*   **Auto-link:** Use `SUM-123` in branch names (e.g., `SUM-123-feature-name`).
*   **Auto-close:** Merging PR closes Linear issue.
*   **Label Sync:** Tag PRs with matching Linear labels.

### Claude / Agents
*   **Context:** Reference Linear IDs in prompts and commit messages.
*   **Status Updates:** Agents should update status to `Agent Assigned` when starting and `In Review` when PR is up.

### n8n Workflows
*   **Daily Triage:** Move old P1s to P0, flag stale issues.
*   **Weekly Health:** Generate summaries with `weekly-health`.
*   **Dependency Alerts:** Notify when blocked issues stall.
