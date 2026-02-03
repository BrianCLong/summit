# Cognitive Security Operator Runbook

## Overview
This runbook guides the Incident Commander and Fusion Cell through the lifecycle of a cognitive security incident.

## Phase 1: Detection & Triage
**Goal**: Confirm validity and severity.

1.  **Ingest Signal**:
    *   Source: Employee report, social listening, security alert.
    *   Action: Create `CognitiveIncident` ticket.
2.  **Verify Artifact**:
    *   If Audio/Video: Check for artifacts (glitching, lip-sync errors). Use internal logs to verify exec location/activity.
    *   If Text/Web: Check domain registration, SSL cert, source URL.
3.  **Severity Assessment**:
    *   **SEV-1**: Immediate financial/safety impact (e.g., fake CEO announcing bankruptcy).
    *   **SEV-2**: Brand reputation risk (e.g., viral fake leak).
    *   **SEV-3**: Low-level noise/trolling.

## Phase 2: Analysis & Context
**Goal**: Understand the narrative and actors (without profiling individuals).

1.  **Narrative Analysis**:
    *   What is the claim?
    *   Who is the target audience?
    *   Is it spreading? (Velocity, Volume).
2.  **Attribution (Limited)**:
    *   Is this a known actor tactic?
    *   **STOP**: Do not investigate individual user identities unless there is a physical threat.
3.  **Rights Impact Check**:
    *   Before taking action, review: Does this affect free speech? Are we blocking legitimate users?

## Phase 3: Response & Mitigation
**Goal**: Limit damage and correct the record.

### Option A: Strategic Silence
*   Use when: Reach is low, debunking would amplify.
*   Action: Monitor only. Log decision.

### Option B: Proactive Comms
*   Use when: High reach, confusion among stakeholders.
*   Action: Issue Holding Statement. Update FAQ.
*   Template: `templates/cogsec/holding_statement.md`

### Option C: Takedown/Technical
*   Use when: ToS violation (impersonation, malware).
*   Action: Report to platform. Block domain on corporate network.

## Phase 4: Closure & Evidence
**Goal**: Audit trail and learning.

1.  **Generate Evidence Pack**:
    *   Run `exercises/cogsec/runner.py` (or equivalent tool) to bundle artifacts.
    *   Ensure `stamp.json` is present.
2.  **Decision Log**:
    *   Ensure all key decisions are recorded.
3.  **Post-Mortem**:
    *   Review "Do Not Do" compliance.
    *   Update SOP if needed.

## Reference
*   **SOP**: `docs/cogsec/SOP.onepage.md`
*   **Checklists**: `docs/cogsec/checklists/`
*   **Templates**: `templates/cogsec/`
