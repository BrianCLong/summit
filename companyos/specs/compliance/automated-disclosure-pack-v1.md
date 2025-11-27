# Automated Disclosure Pack v1

## Problem & ROI
Compliance leads need to respond to vendor/customer questionnaires quickly with consistent, audit-ready evidence. Manual assembly burns hours per request and increases error risk.

**ROI:** Reduce response time from days → hours, while increasing consistency and traceability.

## Users & Scope
- Primary: Compliance Lead, Security Lead
- Secondary: Sales Engineer (needs quick proof for prospects)
- Out of Scope: Custom legal contract negotiation

## Data & Policy
- Inputs:
  - SBOMs + vuln reports (from Risk & Compliance Automation)
  - SLO/SLA attainment reports (from Observability)
  - Audit logs summary (from Audit service)
- Classification:
  - Mostly non-PII, but may reference internal infra details (confidential).
- Constraints:
  - Must respect data residency (EU/US).
  - Export controlled: some evidence only allowed to specific regions/tenants.

## User Flow
1. User selects: tenant, product, environment, date range.
2. System pre-populates disclosure pack:
   - Build IDs, SBOM links, signing status.
   - SLO attainment summary.
   - Top outstanding CVEs (if any) with status.
3. User reviews & redacts optional sections.
4. User exports pack as PDF/JSON and logs it as an “external disclosure event”.

## Telemetry
Events:
- `disclosure_pack_created`
- `disclosure_pack_exported`
- `disclosure_pack_redacted_section`

Metrics:
- Time from creation to export.
- Number of packs per tenant per month.
- % packs exported while error budget was violated.

## Definition of Ready
- Required SBOM + signing + vuln data available for target product.
- Identity model supports “who can export disclosure packs”.
- Initial UI wireframes approved.

## Definition of Done
- End-to-end flow implemented behind feature flag.
- Telemetry events shipped & visible in analytics.
- Runbook for “customer disclosure request” created.
- At least 2 internal dry-run exports completed and archived.
