# Stabilization Dashboard

This document describes the **Stabilization Dashboard**, a static markdown page generated automatically to provide a single-pane view of the project's stabilization status.

## Overview

The dashboard aggregates data from various stabilization artifacts to present a concise summary for stakeholders. It is generated during the stabilization closeout process.

**Location:** `artifacts/stabilization/dashboard/STABILIZATION_DASHBOARD.md` (in build artifacts)

## What it Shows

1.  **Headline:** Date, Commit SHA, and Snapshot Hash.
2.  **Scorecard Highlights:** Key metrics like Risk Index, On-Time Rate, and Done Counts.
3.  **Overdue & Escalation:** Top overdue items and escalation summary.
4.  **Issuance & Evidence Compliance:** Status of evidence collection and issuance.
5.  **Change Summary:** Summary of what changed since the last snapshot (added/removed/modified).
6.  **Artifact Sources:** Links to the source files used to generate the dashboard.

## Sources of Truth

The dashboard consumes the following JSON/Markdown artifacts from `artifacts/stabilization/`:

*   `status.md` (or `.json`)
*   `escalation.json`
*   `scorecard/scorecard_<date>.json`
*   `snapshots/diff_<prev>_to_<curr>.json`
*   `validate/report.json`

## How to Regenerate Locally

To generate the dashboard locally, ensure you have the required input artifacts in `artifacts/stabilization/`, then run:

```bash
node scripts/releases/generate_stabilization_dashboard.mjs
```

The output will be written to `artifacts/stabilization/dashboard/STABILIZATION_DASHBOARD.md`.
