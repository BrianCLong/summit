Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: soc-compliance-report
Status: active

# SOC Control Verification Gate

**Job:** SOC Control Verification (primary gate)  
**Command:** `bash scripts/test-soc-controls.sh soc-compliance-reports`  
**Evidence:** `soc-compliance-reports/` (artifact: `soc-compliance-report`)

**Fast-lane CI Job:** SOC Controls (`.github/workflows/ci.yml`)

This gate executes SOC control tests and captures compliance reports.
