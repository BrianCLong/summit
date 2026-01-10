# Drift Sentinel Playbook (Semantic Drift Detection)

Semantic drift is the slow erosion of meaning and boundaries. The Drift Sentinel provides continuous comparison between baseline doctrine and current practice to prevent normalization of unsafe changes.

## Baseline

- Anchor text: Purpose Lock Charter, safety invariants, policy bundles, and public commitments.
- Stored fingerprints: Signed hashes of canonical documents and policies stored in the provenance ledger.

## Monitored Signals

- **Claim inflation:** Expanding allowed claims or lowering evidence grades without governance sign-off.
- **Language softening:** Replacing hard constraints with ambiguous terms ("should" instead of "must").
- **Boundary erosion:** New exceptions that bypass red-lines or extend audience/data scopes.
- **Exception drift:** Rising rate or duration of waivers, especially near renewals.

## Detection Methods

- **Text diffing:** Scheduled semantic diff between baseline and live docs/policies using embedding similarity + hard keyword lists for red-lines.
- **Policy validation:** Compare current Rego bundles and hash lineage to registry; alert on deviations.
- **Run-time telemetry:** Track exception usage, policy bypass flags, and provenance completeness by service.

## Alerting & Response

- Tiered alerts: warning at 1% semantic deviation; critical at ≥3% or any red-line keyword removal.
- Mandatory justification required in the incident ticket, attached to audit log with before/after artifacts.
- Auto-create remediation tasks with owners and due dates; unresolved items escalate to governance.

## Integration Points

- CI gate: `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts` must pass for policy or doctrine changes.
- Observability: Emit metrics `continuity.drift.semantic_delta`, `continuity.drift.exceptions`, and `continuity.drift.policy_hash_mismatch`.
- Dashboards: Display drift trends, waiver aging, and provenance completeness per service.

## Succession Safeguard

During authority transitions, increase scan frequency, freeze waiver renewals, and require dual approval to modify baselines. Post-transition, re-baseline only with governance quorum and updated fingerprints stored in the ledger.
