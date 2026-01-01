DOCTRINE_LOCKED = true

# Epistemic Law

Defines the minimum evidentiary standards for decision-making within Summit.

## Admissibility Requirements

- Facts must include provenance (source and attribution) and timestamps.
- Expiry dates are enforced; once lapsed, facts cannot be used without renewal.
- Revoked or superseded facts are quarantined with references to revocation notices.

## Decision Requirements

- Each decision proposal must cite evidence IDs and declared confidence bounds.
- Confidence values are normalized to [0, 1]; anything outside is rejected.
- Authority context must name the accountable human and role.

## Enforcement Hooks

- `DecisionValidator.validate` enforces decision pre-conditions.
- `InformationGate.admit` blocks inadmissible facts at the edge.
- `RefusalRecord` documents any denial and links to doctrine sections referenced.
