# Pilot Execution Reporting Runbook

## Overview
This runbook describes how to generate weekly sponsor reports and sector outcome dashboards for active pilots. The process is automated via GitHub Actions but can be run locally for debugging or ad-hoc reporting.

## Artifacts Produced
- **Sponsor Report (MD/JSON):** High-level status, KPIs, and risk assessment.
- **Outcomes Dashboard (HTML/JSON):** Detailed metrics, readiness summaries, and blocker analysis.
- **Signals (JSON):** Normalized raw data derived from evidence artifacts.

## Inputs
The reporting system ingests:
- `readiness.json`: Run status and verification results.
- `budget.json`: Sync session costs and budget compliance.
- `gates.json`: Gate verification summaries.

## How to Run (CI)
1. Go to **Actions** > **Pilot Reporting**.
2. Click **Run workflow**.
3. Enter `sector` (e.g., `defense`) and `period` (e.g., `2025-W42`).
4. Artifacts will be attached to the run summary.

## How to Run (Local)
1. Ensure dependencies are installed: `pnpm install`.
2. Prepare input artifacts in a directory (e.g., `inputs/`).
3. Run the collection script:
   ```bash
   npx tsx scripts/reporting/collect_pilot_signals.ts defense 2025-W42 inputs/
   ```
4. Generate the report:
   ```bash
   npx tsx scripts/reporting/build_weekly_sponsor_report.ts defense 2025-W42
   ```
5. Generate the dashboard:
   ```bash
   npx tsx scripts/reporting/build_sector_outcomes_dashboard.ts defense 2025-W42
   ```
6. Verify redaction:
   ```bash
   npx tsx scripts/verification/verify_pilot_report_no_leak.ts dist/pilot-reporting/defense/2025-W42 ci/pilot-report-redaction-policy.yml
   ```

## Adding New KPIs
1. Edit `docs/pilots/<sector>/kpis.yml`.
2. Add the KPI definition including `id`, `formula`, and `thresholds`.
3. Update `scripts/reporting/build_weekly_sponsor_report.ts` to implement the calculation logic for the new ID.
4. Run `npx tsx scripts/reporting/validate_kpis.ts` to verify the YAML structure.

## Redaction Policy
Strict no-leak rules are enforced.
- **Denylist:** Internal domains, keys, secrets, PII (email patterns).
- **Allowlist:** Specific fields in `signals.json`.
- **Enforcement:** The pipeline fails if `verify_pilot_report_no_leak.ts` detects any banned patterns in the output directory.
