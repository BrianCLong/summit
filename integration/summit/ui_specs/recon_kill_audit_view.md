# UI Spec: Recon Kill Audit View

## Purpose

Present QSDR kill audit records and recon outputs up to the halt point.

## Key Elements

- Kill audit summary: reason (canary trigger/query-shape violation/privacy budget), policy decision ID, replay token.
- Evidence snippet with support set under proof budget; link to full witness if authorized.
- Recon results delivered before halt with selective disclosure indicators.
- Quarantine status and remediation steps for the module.

## States

- **Halted:** Execution stopped; audit record available.
- **Quarantined:** Module blocked pending review.
- **Cleared:** Module restored after review; historical audits remain accessible.
