# Data Handling: SSDF v1.2 Artifacts

## Classification
- **Public:** `docs/**`, `subsumption/**` (registries).
- **Internal:** Coverage metrics, verifier logs.
- **Confidential:** Security findings (if any) in detailed reports (though standard evidence reports should be sanitized).

## Retention
- Evidence reports (`report.json`) are retained per release cadence.
- Artifacts are version-controlled in the repo (or linked).

## Audit Export
- The `subsumption/ssdf-v1-2/` directory and `evidence/` index constitute the audit export.

## Sanitization
- Never log secrets or tokens in evidence files.
- Raw vulnerability details should be sanitized or referenced by internal ID.
