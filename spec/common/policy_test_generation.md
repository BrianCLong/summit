# Policy-Graph Test Generation

Shared mechanics for generating synthetic graph fixtures and test cases to validate policy and
ontology changes.

## Fixture Generation

- **Constraint solving:** enforce ontology field types, cardinalities, and required relations.
- **Seeded randomness:** deterministic seeds to allow reproduction of fixtures.
- **Boundary cases:** produce fixtures that target redaction and purpose-based limits.

## Test Execution

- Execute access tests against the policy engine.
- Compare outcomes to reference baselines from a prior policy version.
- Record deltas as allow-expansions or deny-expansions.

## Outputs

- **Governance test report:** outcomes, deltas, and explanation artifacts.
- **Replay token:** policy version pair, ontology version pair, and seed.
- **Commitments:** Merkle root over fixture IDs and test case hashes.

## Operational Notes

- Limit execution via maximum test count or runtime budgets.
- Cache fixture generation by policy+ontology hash.
