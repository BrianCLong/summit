# Anti-Capture Incentive Design

Capture risk is driven by incentives more than intent. This guide maps capture vectors and injects structural friction that preserves evidence integrity and safety.

## Capture Risk Map

- **Monetization pressure:** Requests to lower evidence thresholds or disable provenance for latency/cost savings.
- **Speed mandates:** Demands for unreviewed hotfixes, bypassed governance, or temporary flags that never expire.
- **External influence:** Vendor, partner, or investor asks to change default narratives, filters, or prioritization.
- **Leadership churn:** New leaders deprioritizing governance in favor of growth metrics.

## Drift Indicators

- Rising exception counts or waiver duration.
- Increased use of unvetted data sources.
- Vocabulary shifts that soften red-lines or redefine "evidence" and "safety".
- Latency targets overriding safety and provenance budgets.

## Automatic Friction Triggers

- **Policy gates:** Block deployments that reduce evidence level or disable provenance without a signed waiver and expiry.
- **Budget guards:** Enforce minimum resource allocation for safety services (policy engine, provenance ledger, abuse monitoring).
- **Exception decay:** Auto-expire waivers; require fresh justification and dual approval to renew.
- **Narrative neutrality:** Prevent default ranking/filters from being driven by external party preferences; require policy review for weighting changes.

## Incentive Alignment

- Tie performance metrics to safety uptime, provenance completeness, and incident-free days.
- Require cost/speed optimizations to include evidence impact statements and mitigation steps.
- Provide leadership dashboards that surface safety debt and capture risk posture.

## Operating Procedures

- Quarterly capture risk review with governance and product.
- Mandatory capture assessment for any new revenue model, pricing change, or partner integration.
- Pre-merge checklist includes capture risk classification and mitigation sign-off.

## Enforcement Linkage

- Implement capture risk rules in `policies/continuity.rego`.
- Integrate Drift Sentinel alerts into incident response runbooks.
- Record all overrides in the immutable audit log with expiry and owner.
