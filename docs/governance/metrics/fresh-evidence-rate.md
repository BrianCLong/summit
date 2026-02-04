# Fresh Evidence Rate (7d)

**Control ID:** GOV-EVID-004
**Objective:** Ensure CI consistently emits verifiable, timely evidence bundles.

**Definition**
% of `main` runs in last 7 days producing a verified evidence bundle
with attested build time ≤ 24h from run completion.

**Thresholds**
- Green: ≥95%
- Yellow: 85–94%
- Red: <85%

**Failure Signals**
- Missing provenance
- Invalid signature
- Stale or replayed bundle

**Owner:** Release Captain
**Evidence:** `fresh-evidence-rate.json`
