# Collaboration, Reporting, UX, AI Assistant and Audit Trail Plan

## 1. Real-Time Collaborative Graph Environment
- Integrate a CRDT library (Y.js or Automerge) in the `realtime` module.
- Provide a WebSocket endpoint `/collab` to sync graph documents.
- Broadcast presence events such as `"Analyst A is editing"` via existing Socket.IO namespace.
- Store edit history in audit logs for compliance.

## 2. Automated Report Generation System
- Define Jinja/Nunjucks templates for:
  - Intel Summary
  - Entity Dossier
  - Network Report
- Generate HTML and PDF using headless Chrome (Puppeteer) or WeasyPrint.
- Allow one-click export from graph or entity view and log each export in audit tables.

## 3. Analyst UX Improvements
- Implement a navigation drawer to switch dashboards and workspaces.
- Allow analysts to pin favorite entities/timelines (persisted in local storage).
- Add in-app search with autocomplete result previews.
- Conduct feedback sessions with analysts to iterate on usability.

## 4. AI Assistant Framework
- Create backend route `/api/assistant` for LLM-powered chat.
- Maintain system prompt template `Intelgraph Analyst Assistant` with context slots.
- Support actions:
  - `Summarize <X>`
  - `Compare <Y> vs <Z>`
  - `Recommend next steps`
- Stub UI component for chat panel awaiting model integration.

## 5. Audit Trail & User Action Logs
- Extend audit logging to record graph edits, report exports, and workspace changes.
- Expose `/activity` endpoint to fetch logs.
- Provide timeline view in UI for transparency and compliance.

## Next Steps
1. Resolve npm dependency issues (`@turf/point-in-polygon`) to enable installing `yjs` and `nunjucks`.
2. Implement CRDT sync service and report templates as described.
3. Build UI components and connect to new backend endpoints.
4. Run lint, tests, and security checks once dependencies install successfully.
