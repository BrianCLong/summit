# War Room Experience Design

## Concept
The War Room is a dedicated, ephemeral digital workspace instantiated for every SEV-1 and SEV-2 incident. It serves as the central hub for coordination, investigation, and context.

## Creation Triggers
*   **Manual:** via `/incident` ChatOps command or "Declare Incident" button in the HUD.
*   **Automated:** triggered by specific high-fidelity alerts (e.g., "Main DB Unreachable").

## Features

### 1. Unified Dashboard (The "HUD")
*   **Status Header:** Shows current Severity, State, and IC.
*   **Timeline View:** A real-time log of events, automated alerts, and manual entries (chat messages tagged as `#decision` or `#evidence`).
*   **Metrics Panel:** Auto-linked Grafana/Prometheus charts relevant to the affected service.

### 2. Context Auto-Linking
*   **Service Catalog:** Link to `services/` metadata (owners, runbooks, upstream/downstream deps).
*   **Recent Changes:** Feed of recent deployments, feature flag toggles, and config changes (via Provenance Ledger).
*   **Related Incidents:** Vector search against past incident postmortems for similar symptoms.

### 3. Evidence Capture
*   **Chat Integration:** Two-way sync with a dedicated Slack/Teams channel.
*   **Command Log:** If using the CLI/ChatOps to run diagnostics, output is automatically captured in the timeline.
*   **Snapshotting:** "Capture State" button to dump current metrics, logs, and stack traces to an artifact bundle.

## User Flow
1.  **Alert Fired**: "Database latency > 5s".
2.  **Room Created**: `incident-2025-10-27-db-latency` created.
3.  **Page Out**: On-call engineer paged with link to War Room.
4.  **Triage**: Engineer accepts role as IC.
5.  **Investigation**: IC invites DB SME. SME runs queries via ChatOps. Results appear in Timeline.
6.  **Mitigation**: SME proposes failover. IC approves. Action logged.
7.  **Resolution**: Latency drops. State moved to Monitoring.
8.  **Closure**: Room archived to "Postmortem Pending" state.
