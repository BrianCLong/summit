# Policy-Graph Test Generation

Shared methods for compiling policies and ontology constraints into regression suites with replayable evidence.

## Inputs

- **Policy specification:** rules, versions, and purpose constraints.
- **Ontology specification:** entity types, relations, field constraints, and cardinalities.

## Generation Flow

1. **Fixture synthesis:** constraint solving to generate synthetic graph instances that satisfy ontology structure.
2. **Access test cases:** boundary and purpose-specific requests targeting redaction rules and deny/allow edges.
3. **Execution:** run cases against the access evaluation engine under execution budgets (max tests, runtime).
4. **Comparison:** detect governance regressions by comparing with reference outcomes (prior policy/ontology versions).

## Outputs

- **Governance test report:** regression summary, replay token (policy/ontology version pairs + seed), Merkle root over fixtures, and optional TEE attestation.
- **Explanations:** minimal rule sets responsible for observed regressions and counterfactual test bundles for changed rules.

## Reuse & Caching

- **Fixture cache:** keyed by policy and ontology hashes for reuse across runs.
