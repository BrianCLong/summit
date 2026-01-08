# Continuous Compliance Dashboard

## Overview
The Continuous Compliance Dashboard is an automated, artifact-driven system that aggregates compliance signals from across the software delivery lifecycle into a single, canonical status report. It runs weekly (or on-demand) and produces safe-to-share artifacts.

## Architecture
The dashboard is strictly **artifact-driven**. It does not query live databases or external APIs. It consumes machine-readable JSON artifacts produced by upstream CI/CD workflows:

- **Maturity:** `dist/maturity/maturity-eval.json`
- **Readiness:** `dist/readiness/readiness.json`
- **Policy:** `dist/policy-evidence/policy-evidence.json`
- **Dependencies:** `dist/deps/deps-eval.json`
- **Promotion:** `dist/promotion/promotion-guard.json`
- **Incident Drills:** `dist/drills/incident-drills.json`
- **Field Mode:** `dist/field/field-readiness.json`

## Running Locally

1. **Prerequisites:** `node` (v20+), `tsx`.
2. **Gather Artifacts:** Place the source JSON files in their respective folders under a `dist/` directory (or customize `ARTIFACTS_DIR`).
3. **Run Collection:**
   ```bash
   export ARTIFACTS_DIR=./dist
   export OUTPUT_DIR=./dist/compliance
   npx tsx scripts/reporting/collect_compliance_signals.ts
   ```
4. **Run Build:**
   ```bash
   npx tsx scripts/reporting/build_compliance_dashboard.ts
   ```
5. **Verify:**
   ```bash
   npx tsx scripts/verification/verify_compliance_dashboard_no_leak.ts
   ```

## Posture Rubric

The "Executive Posture" is calculated deterministically:

- **HEALTHY:**
  - Maturity signal present.
  - Readiness gates passed.
  - Policy is drift-free.
  - Promotion guard (if present) allows.

- **DEGRADED:**
  - Policy drift detected (but not blocked).
  - Missing non-critical signals (e.g., Promotion signal missing in early stage).

- **NON-COMPLIANT:**
  - Required readiness gates failed.
  - Promotion explicitly DENIED.

- **UNKNOWN:**
  - Critical signals (like Maturity) are completely missing.

## Adding/Removing Signals
To add a new signal:
1. Update `scripts/reporting/collect_compliance_signals.ts` to read the new artifact and add it to the `ComplianceSignals` interface.
2. Update `scripts/reporting/build_compliance_dashboard.ts` to include the new data in the `sections` of the dashboard and `compliance.md`.
3. Update `scripts/verification/verify_compliance_dashboard_no_leak.ts` to allow the new keys in the schema.

## Troubleshooting
- **MISSING inputs:** If an input is reported as `MISSING` in `signals.json`, check the upstream CI job that produces it. The dashboard will not fail the build for missing inputs, but will report DEGRADED or UNKNOWN status.
- **Verification Failure:** If the no-leak verifier fails, check for potential secrets or unapproved URLs in the input data. The verifier is "fail-closed".
