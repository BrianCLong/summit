# Risk & Incident Readiness

## Overview
This document outlines Summit's production risk envelope and incident readiness framework. Our goal is to balance development velocity with strict reliability guarantees for high-stakes environments (GA/Production).

## 1. Production Risk Envelope

The Risk Envelope is a codified policy that classifies changes based on their blast radius and type. It is defined in [`configs/risk/production-risk-envelope.yaml`](../../configs/risk/production-risk-envelope.yaml).

### How it Works
Every change targeting a critical channel (like `ga`) is validated against this policy.

*   **Inputs:** Changed files, target channel.
*   **Outputs:** Risk Level (Low, Medium, High, Blocked).

### Risk Levels
*   **Low Risk:** Routine UI/Docs changes. Approved automatically by GA gate.
*   **Medium Risk:** Code changes < 5 modules. Requires Dry-Run.
*   **High Risk:** Core changes or large blast radius. Requires Evidence Bundle & War Room.
*   **Blocked:** Forbidden changes (e.g., destructive schema changes in GA).

### Validation Tool
You can manually check the risk of a set of files:

```bash
# Check risk for a specific file list
node scripts/risk/validate_change_risk.mjs --files changed_files.txt --channel ga
```

## 2. Incident Readiness

We practice **Incident Drills** to ensure our rollback and detection mechanisms are effective.

### Drill Harness
We have a unified harness for running drills: [`scripts/incidents/run_incident_drill.mjs`](../../scripts/incidents/run_incident_drill.mjs).

**Usage:**
```bash
# Dry Run (Safe to run anywhere)
node scripts/incidents/run_incident_drill.mjs --mode dry-run

# Simulate (Simulates detection delays, safe)
node scripts/incidents/run_incident_drill.mjs --mode simulate
```

### CI Integration
Drills can be triggered via GitHub Actions: **[Incident Drill Workflow](../../.github/workflows/incident-drill.yml)**.

## 3. Connection to GA & Stabilization

This framework integrates directly into our release governance:

1.  **GA Gate:** `make ga` runs the risk validator. If your change is High Risk, it will warn you to prepare an Evidence Bundle.
2.  **Release Workflow:** The CI pipeline will fail if you attempt to push a `Blocked` change to GA.
3.  **Drill Certification:** Major releases (vX.0.0) require a passing Incident Drill artifact in the release evidence.

## 4. Dashboards
Artifacts from drills and risk assessments are stored in `artifacts/`.
*   Drill Logs: `artifacts/incidents/drills/`
*   Risk Dashboard: `artifacts/risk/RISK_INCIDENT_DASHBOARD.md` (Generated)
