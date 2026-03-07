# Data Handling: OMB M-26-05 Evidence Packs

## Classification
Assurance Evidence Packs are classified as **Controlled – Vendor Deliverable**. They contain component inventories and vulnerability status but should not contain secrets or customer data.

## Retention Policy
- **CI Artifacts:** Retained for 90 days (standard GitHub policy).
- **Release Assets:** Retained for the duration of the software version lifecycle.
- **Drift Logs:** Retained for 30 days.

## Redaction Requirements
- No tokens or API keys.
- No internal environment variables (except version/build metadata).
- No raw vulnerability tool authentication headers.

## Disclosure
Packs are intended for authorized agency reviewers and designated risk assessors. Public disclosure should only include the high-level SBOM unless otherwise contracted.
