# Continuity Amendment Procedure

This document codifies the only permitted path to modify continuity doctrine, purpose lock language, or policy bindings.

## Eligibility & Authority

- Amendments may be proposed only by governance council members or designated custodians (see `docs/continuity/custodianship.md`).
- Emergency amendments require dual approval from the governance chair and security chair and expire after 30 days unless ratified.

## Submission Requirements

- Amendment ticket with ID, rationale, scope, and expected debt delta.
- Impacted artifacts enumerated (documents, policies, runtime configurations).
- Evidence plan: tests, policy simulations, and observability updates.
- Counter-capture analysis describing why the change does not weaken safety or provenance.

## Review Workflow

1. **Draft & Publish:** Store draft in version control; attach prompt metadata and provenance hashes.
2. **Cooling Period:** 14-day review window for non-emergency amendments; collect comments and risk assessments.
3. **Simulation:** Run Drift Sentinel comparison and policy simulations to show expected impact.
4. **Approval:** ≥75% governance council vote plus security chair sign-off. For emergency amendments, ratify or retire before expiry.
5. **Activation:** Merge with validated metadata, regenerate fingerprints, and update the immutable audit log.

## Post-Activation Duties

- Update the Purpose Lock references and Rego bundles where applicable.
- Refresh dashboards and documentation; publish a change note in `docs/continuity/CHANGELOG.md`.
- Schedule a follow-up review (≤60 days) to ensure the amendment behaves as intended and has not introduced capture risk.

## Rollback Plan

- If metrics or incidents indicate regression, revert to the previous tagged version and restore prior policy bundles.
- Re-run safety and drift scans to confirm reversion; document findings in the audit log.
