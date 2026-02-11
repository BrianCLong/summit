# Ops Hardening Evidence Bundle

This directory contains the template for creating evidence bundles related to Operational Hardening tasks (e.g., DR drills, security incidents, manual overrides).

## Usage

When closing an Ops/Security issue that requires evidence but is not fully automated by CI:

1.  **Copy this directory** to `evidence/<EVIDENCE-ID>/`.
    - Example ID: `EVD-OPS-2025-DR-DRILL-001`
2.  **Fill in `report.json`** with the summary of the action, links to logs, screenshots, or other artifacts.
3.  **Update `metrics.json`** with any relevant metrics (e.g., time to recovery, number of affected users).
4.  **Update `stamp.json`** with the current timestamp and actor.
5.  **Commit** the new directory.
6.  **Add entry** to `evidence/index.json`.

## Files

- `report.json`: The main narrative of the evidence.
- `metrics.json`: Structured data points.
- `stamp.json`: Metadata about the evidence generation (who, when).

## validation

Run `python3 scripts/evidence_validate.py` (or equivalent) to ensure the bundle is valid.
