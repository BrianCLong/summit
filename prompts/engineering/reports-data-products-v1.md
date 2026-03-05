# Prompt: Reports Data Products v1

Implement API endpoints and reporting infrastructure for Sprint +2 Data Products.

## Objectives
- Deliver exportable Approval & Risk, Incident Evidence Manifest, and Policy Coverage reports.
- Ensure manifests include receipts, hash chaining, and deterministic hashing.
- Enforce tenant scoping and access control on report generation and downloads.

## Constraints
- Use existing reporting service and evidence signing utilities.
- Keep changes within server/reporting and server/routes plus roadmap updates.

## Verification
- Add unit tests for report storage and tenant scoping.
- Ensure deterministic manifest hashing for receipts.
