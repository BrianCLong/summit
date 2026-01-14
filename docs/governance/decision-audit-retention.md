Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Decision Audit Retention Note

To align with zero-trust governance, all policy decision events are now sent to the centralized audit bus and marked for retention. The Trust Propagation Controller publishes structured `policy_decision` events (actor, action, outcome, trust score, correlation IDs) into the SIEM-backed audit pipeline to satisfy AU-2/AU-12 retention requirements.

Sample retained payload: see `docs/governance/log-samples/decision-audit-sample.json` for an emitted event that includes enforcement metadata, compliance flags, and correlation identifiers.

The audit bus envelope captured in `artifacts/logs/policy-decision-audit-sample.json` mirrors the retention-required decision events emitted by the policy enforcer and demonstrates the downstream SIEM handoff used to satisfy AU-9/SC-7 retention commitments.

Retention follows the platform’s audit defaults (7-year audit class per `data-retention-policy.md`, with hot-to-archive transitions managed by the platform) unless stricter tenant policies override it.
