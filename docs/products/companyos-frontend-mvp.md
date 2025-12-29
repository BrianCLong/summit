# CompanyOS Frontend MVP – Information Architecture & UX Flows

## Goals

- Deliver a production-ready IA and UX blueprint for the CompanyOS MVP using React + TypeScript and a component library (e.g., MUI/Chakra) with an existing API.
- Make global search first-class, enforce a consistent entity-page pattern, and streamline approvals to minimize clicks and mis-use.

## Information Architecture

- **Global Navigation** (persistent left rail or top bar): Home, Projects, Policy Center, Approvals, Admin, Search (Cmd/Ctrl+K), Help/Profile.
- **Global Search**: Keyboard shortcut (Cmd/Ctrl+K), quick-open palette plus dedicated results page with facets (Object type, Owner, Status, Date, Tags, Policy version). Supports recent items and saved filters.
- **Entity Page Pattern (consistent across key objects: Project, Task, Policy, Request/Approval, User, Integration)**:
  - Header: title, key metadata chips (status, owner, priority/version), actions (Edit, Share, Export, More), breadcrumbs.
  - Summary strip: last updated, watchers, linked entities (e.g., project ↔ policies), SLA/badges.
  - Primary tabs: Overview (default), Activity/Timeline, Attachments/Docs, Related (dependencies/linked items), Audit/History.
  - Right rail: contextual quick actions (Add task, Request approval), people list, due dates, reminders.
  - Secondary actions: subscribe/notify, duplicate/template, quick comment.
- **Sections**:
  - **Home**: personalized snapshot of tasks, approvals, policies needing acknowledgement, project milestones, and system health.
  - **Projects**: list + filters; each project opens entity page with tasks/docs/timeline.
  - **Policy Center**: browse policies, acknowledge, view version history and diffs.
  - **Approvals**: inbox for pending requests; bulk actions with safe-guards.
  - **Admin**: users, roles, integrations; audit & environment settings.
  - **Help/Profile**: keyboard shortcuts, notification settings, profile preferences.

## Wireframe-Level Specs

### Home Dashboard

- **Hero row**: "Today" banner with search bar (Cmd/Ctrl+K hint) and quick actions (New project/task/request). KPI cards: Open approvals, Tasks due, Policy acknowledgements pending.
- **My Work**: task list with status chips, inline quick-complete, snooze, and priority filter.
- **Approvals at a glance**: compact table (Request, Requester, Due, Impact) with Approve/Request changes quick actions.
- **Policy reminders**: list of policies pending acknowledgement; one-click "Acknowledge" with confirmation modal.
- **Projects overview**: cards/rows with health (green/amber/red), milestones, next deliverable.
- **Activity feed**: recent comments, approvals, acknowledgements, integrations events.

### Global Search & Results

- **Palette (Cmd/Ctrl+K)**: input + quick filters (typeahead by entity type), recent items, keyboard-first (↑/↓ to navigate, Enter to open, Cmd/Ctrl+Enter to open in new tab). Esc to close.
- **Results page**: left filters (Type, Status, Owner, Date range, Tag, Policy version, Integration source); main list grouped by entity type with badges. Pagination + sort (Relevance, Updated, Priority). Inline preview on hover.
- **Result item pattern**: title, type icon, primary metadata (status, owner, due/version), match highlights, last activity, quick actions (Open, Copy link, Add to project, Request approval if applicable).

### Policy Center

- **Browse view**: filters (Category, Owner, Status, Version, Effective date, Tags). Table with Policy name, Version, Status (draft/effective/deprecated), Owner, Last updated, Required acknowledgement chip.
- **Detail entity page**: consistent pattern with Overview (summary, current version, effective/expiry dates, linked controls), Requirements tab, Version History tab (diff viewer between versions), Activity/Audit tab. Right rail: acknowledgement status, "Acknowledge" button with confirmation + reason note, download/export.
- **Acknowledge flow**: click Acknowledge → confirmation modal (shows version, effective date, change summary, attest checkbox) → success toast and recorded in activity/audit.

### Approvals Inbox

- **Inbox list**: grouped by urgency/due date; columns for Request, From, Related entity (project/task/policy), Due, Impact, Status. Bulk select enabled but actions require confirmation.
- **Detail drawer**: opens from list without losing context; shows request summary, diffs/attachments, comments, history, and recommended action. Buttons: Approve, Request changes, Deny, Delegate (optional). Inline comment box with @mentions.
- **Safety**: Approve/Deny require confirmation modal with summary; Request changes requires comment; Deny requires reason. Keyboard shortcuts: A (approve), R (request changes), D (deny) with modal focus.
- **Post-action**: success banner + undo (where safe), auto-advance to next item; audit logged.

### Project Workspace

- **Project list**: filters (Owner, Status, Priority, Tag, Due). Rows/cards with health indicator and next milestone.
- **Project entity page**: Overview (summary, goals, risks, blockers, linked policies), Tasks tab (kanban/table toggle with inline status changes, due dates, owners), Docs tab (rich documents, versioning), Timeline tab (milestones, approvals, decisions), Activity tab (comments + audit). Quick action: "Request approval" for milestones.
- **Task detail flyout**: title, status, assignee, due, subtasks, links to policy/approval, comments, attachments; inline edit.

### Admin Console

- **Users**: table with status, role, MFA, last active; actions to invite, deactivate, reset MFA; detail page with activity/audit.
- **Roles & Permissions**: role list with scopes; detail view to edit policies/permissions with guardrails (review before save).
- **Integrations**: catalog of available connectors, status badges (connected/error), configure modal with secrets masked, test connection, webhook health.
- **Audit**: log viewer with filters (actor, action, entity, date, outcome).

## State Management Approach

- **Data fetching**: React Query (or TanStack Query) for server cache, retries, background refresh. Use normalized cache keys per entity type (e.g., `projects/{id}`) to power entity page consistency.
- **Global state**: lightweight store (Zustand/Redux Toolkit) for UI state (nav selection, modals, keyboard shortcut palette state) and optimistic actions (task status, approvals where safe).
- **Optimistic updates**: allowed for non-destructive actions (task status, checklist toggles) with rollback on error. Approvals/acknowledgements use server confirmation to avoid mis-use; show pending state on action.
- **Prefetching**: on hover/focus for entity links and search suggestions; keep-alive caches for recently opened entities.
- **Error boundary strategy**: per-section boundaries plus global fallback with retry and support link.

## Accessibility Checklist

- Keyboard: full tab/shift-tab order, focus outlines, skip-to-content, logical nav order, palette opens via Cmd/Ctrl+K, action shortcuts documented, Enter/Esc semantics.
- ARIA: landmarks (nav, main, header, search, complementary), aria-expanded/controls for accordions, role="dialog" with aria-modal, labelled buttons, live regions for toasts.
- Contrast: AA-compliant colors, test for text/icons, focus states with ≥3:1 contrast.
- Forms: visible labels, associated inputs, error text linked via aria-describedby, sufficient hit areas.
- Tables: headers (<th scope>), keyboard sortable columns, row selection accessible.
- Motion: reduce motion preference respected for animations.

## Error, Empty, and Loading States

- **Loading**: skeletons for lists/cards, spinners only for short tasks; show contextual text ("Loading approvals...").
- **Empty**: friendly illustration + primary CTA (e.g., "No approvals. View history"), secondary guidance links.
- **Error**: inline banner with concise message, retry button, error code for support; destructive actions confirm dialogs; failed optimistic updates roll back with toast and details.
- **Offline/retry**: detect network issues, show offline bar, queue safe writes when feasible, disable irreversible actions.

## Acceptance Criteria Mapping

- **Entity pages**: shared pattern defined above for Projects, Tasks, Policies, Approvals, Users, Integrations to ensure consistency.
- **Search first-class**: Cmd/Ctrl+K palette, dedicated results with filters/facets, hover preview, saved filters.
- **Approval flows**: keyboard shortcuts, detail drawer with confirmation modals, required reasons on deny/request changes, undo where safe, minimal clicks via inline actions + auto-advance.

## Future-Ready Enhancements (forward-leaning)

- Add AI-assisted summaries for entity headers (e.g., project risk or policy change digest) and approval recommendations with explainability.
- Context-aware caching strategy that prefetches related entities based on graph relationships (project ↔ policies ↔ approvals) to minimize latency.
- Timeline view backed by event sourcing to support time travel and audit replay in UI.
