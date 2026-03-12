# Jules Orchestration Supervisor

## Overview
This runbook details the scheduled execution and operation of the Jules Orchestrator script, which functions as the supervisor for active Jules sessions within the repository.

The orchestrator guarantees that the multi-agent system does not succumb to scope drift, duplicate Pull Requests, or deterministic artifact violations, maintaining system stability and data integrity.

## Functionality
The `scripts/orchestration/jules-orchestrator.py` script executes three primary functions:
1. **Active Session Monitoring**: Identifies active remote branches associated with Jules and targeted execution themes (e.g., `monitoring`, `benchmark`, `adapters`, `leaderboard`, `research`).
2. **Duplicate/Scope Drift Detection**: Scans branch names for overlapping topics to flag redundant efforts or scope drift across multiple sessions.
3. **Deterministic Artifact Violations**: Iterates through JSON files under the `evidence/` and `artifacts/` directories to detect illicit non-deterministic fields (e.g., wall-clock timestamps) present in artifacts that are not `stamp.json`, `schema.json`, or `metrics.json`.

## Outputs
The orchestrator emits a structured JSON report to:
`artifacts/jules-orchestration-report.json`

## Daily Schedule
The script is designed to run on a daily schedule via the GitHub Actions workflow defined in `.github/workflows/jules-orchestration.yml`. It automatically commits the resulting report to the repository.

## Usage
To trigger a report generation manually, execute the following from the repository root:
```bash
python3 scripts/orchestration/jules-orchestrator.py
```
