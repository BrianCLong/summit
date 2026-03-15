# Alert Workflows

This document outlines the internal analyst-facing workflows for managing generated risk alerts.

## Workflow States
Alerts can reside in one of three states:
- NEW
- IN_REVIEW
- HANDLED

Transitions between these states are entirely human-driven via the CLI.

## CLI Usage
List alerts: `summit alerts list --type [persona|campaign]`
Update status: `summit alerts update [alert_id] [new|in_review|handled]`

### Commander's Intent
This provides a clean, auditable surface for analysts to triage threats, bridging the gap between detection and investigation without resorting to auto-remediation.

### Abuse Analysis
**Risk:** Workflow actions could be abused to trigger automatic engagement, silencing, or external communications.
**Mitigation:** State transitions are strictly manual administrative actions. The workflow explicitly lacks any outbound integration or capability to automate remediation steps.
