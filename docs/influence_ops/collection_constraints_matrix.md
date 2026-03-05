# Influence Ops Collection Constraints Matrix

This matrix records permitted collection methods by platform and jurisdiction. Any row marked
"Deferred pending legal review" is blocked until legal, ToS, and DPIA approvals are recorded.

## Matrix

| Platform Category | Collection Mode | Allowed Methods | Constraints | Status |
| --- | --- | --- | --- | --- |
| API-supported social platforms | API-first | Official API, authenticated feeds, export archives | Respect rate limits, retention class, and audit logging | Allowed |
| Ephemeral content platforms | API-first + capture | Short-lived capture with retention windows and provenance stamps | Explicit retention policy, region-bound storage | Allowed |
| Messaging platforms | API-first | Official export tools and enterprise connectors | Tenant consent + export audit | Allowed |
| API-less collection (public) | Governed exception | Headless capture, curated scraping, evidence snapshots | ToS review, DPIA, legal approval by jurisdiction | Deferred pending legal review |
| API-less collection (restricted) | Prohibited | Any automated collection beyond explicit authorization | Policy block | Prohibited |

## Required Approvals

- Legal review by jurisdiction.
- Platform ToS review.
- DPIA completion and record in governance ledger.
- Approved "Governed Exception" entry with evidence ID.

## Evidence Requirements

Every collection run MUST emit:

- `report.json` with source list and constraints applied.
- `metrics.json` with coverage and rate-limit compliance.
- `stamp.json` with Evidence ID and policy hash.
