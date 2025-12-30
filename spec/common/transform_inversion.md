# Transform Inversion and Minimal Plans

Guidance for reconstructing the minimal generating transform subplan for a resulting entity/edge set.

## Inputs

- **Transform registry:** specifications mapping input entity types to output entity/edge types with version identifiers.
- **Target result set:** entities or relations with origin metadata.

## Inversion Flow

1. **Dependency graph construction** linking transforms via input/output signatures.
2. **Inverse search** with budgets on depth and explored subplans; objective minimizes transforms, inputs, and source calls.
3. **Validation** by replaying candidate plans under determinism tokens.
4. **Redaction** of inputs/intermediates according to disclosure constraints.

## Outputs

- **Inversion artifact:** candidate plan, minimal input set, witness chain (hash commitments to intermediates and target results), replay token (transform/source versions).
- **Security:** Merkle root commitment to the plan, optional TEE attestation quote.

## Counterfactuals

- Generate alternative candidate plans ranked by likelihood to test robustness.
