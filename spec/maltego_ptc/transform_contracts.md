# Transform Contracts

## Contract Fields

- **Effect declarations**: READ, WRITE, EXPORT.
- **Disclosure constraints**: max bytes, max entities, sensitivity class.
- **Provenance guarantees**: required source attribution.

## Validation

- Effect declarations are validated against policy-as-code rules.
- Disclosure constraints are enforced prior to output assembly.
- Provenance requirements must be satisfied or execution fails.

## Result Artifacts

- Witness record committing to inputs and outputs.
- Provenance record linking source identifiers.
- Replay token binding to time window + source versions.
