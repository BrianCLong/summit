# Replit Agent Subsumption (Summit)

## Readiness Assertion

Summit readiness remains governed by `docs/SUMMIT_READINESS_ASSERTION.md`. This subsumption work
aligns evidence artifacts and gated scaffolding with the readiness contract.

## Scope

This bundle translates public Replit Agent capabilities into Summit-native, gated primitives with
explicit evidence IDs and deny-by-default policies.

## Implemented Foundation (Lane 1)

- Evidence index entries for the Replit Agent subsumption IDs.
- Deny-by-default policy verification with explicit allowlist and classification.
- Integration registry skeleton with never-log field support.
- Autonomy budget enforcement with fail-closed behavior.

## Feature-Flagged Innovation (Lane 2)

- Scaffold generator gated by `SUMMIT_SCAFFOLD_ENABLE`.
- Repair harness gated by `SUMMIT_REPAIR_ENABLE`.
- Automations runner gated by `SUMMIT_AUTOMATIONS_ENABLE`.

## Evidence Map

| Evidence ID | Focus |
| --- | --- |
| EVD-REPLITAGENT-FOUND-001 | Evidence core presence + schema sanity |
| EVD-REPLITAGENT-POLICY-001 | Deny-by-default enforcement |
| EVD-REPLITAGENT-INTEG-001 | Integration registry behavior |
| EVD-REPLITAGENT-AUTO-001 | Autonomy budget fail-closed |
| EVD-REPLITAGENT-SCAFF-001 | Scaffold gating + determinism |
| EVD-REPLITAGENT-REPAIR-001 | Repair gating + constrained output |
| EVD-REPLITAGENT-AUTOM-001 | Automations gating + metadata |

## Governance Alignment

- Deny-by-default remains the baseline. Explicit allowlists are required to enable integrations.
- Evidence artifacts remain deterministic (timestamps only in `stamp.json`).
- Feature flags provide reversible rollout control.

## Rollback

- Revert the commit to remove the subsumption scaffolding.
- Leave feature flags disabled to halt lane 2 execution.
