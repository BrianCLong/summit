# Data Handling: Execution Governor

## Policy
The Execution Governor tracks high-level business metrics. It **must not** store Sensitive Personal Information (SPI) or Personally Identifiable Information (PII) in the repository.

## Never Store
*   **Emails**: No customer or candidate email addresses.
*   **Phone Numbers**: No phone numbers.
*   **Full Names**: No names of leads, prospects, or candidates.
*   **Contract PDFs**: No actual legal documents.
*   **PO Docs**: No purchase orders.

## Only Store
*   **Counts**: Number of outreach emails sent, number of replies.
*   **Anonymized IDs**: `lead_001`, `cand_102`.
*   **Stage Enums**: `OUTREACH`, `MEETING_BOOKED`, `LOI_SIGNED`.
*   **Revenue Totals**: Integer values (e.g., `1500`).

## CRM & Billing Integration
*   If/when real billing or CRM systems are connected:
    *   Credentials must be kept in `secrets/` (git-ignored) or environment variables.
    *   Raw exports from these systems must **never** be committed to the repo.
    *   Use intermediate scripts to aggregate data into the allowed "Counts/Anonymized IDs" format before committing to `artifacts/execution/`.

## Enforcement
*   **Redaction Lint**: Automated checks (grep/regex) should verify no `@` symbols or common PII patterns exist in `data/execution/` or `artifacts/execution/`.
