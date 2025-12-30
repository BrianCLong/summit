# Disclosure Constraints

Shared disclosure control primitives used across analytics, transforms, and recon outputs.

## Constraint Types

- **Egress Byte Budget:** Cap maximum bytes returned per request or per tenant window.
- **Cardinality Limits:** Bound number of entities, edges, or rows emitted.
- **Group Size Thresholds:** Minimum count (e.g., k-anonymity) for aggregates.
- **Noise Injection:** Differential privacy parameters (epsilon/delta) and seed.
- **Redaction Rules:** Field-level suppression, tokenization, or hashing policies.

## Enforcement Points

- **PQLA:** Applied post-analytics before output; enforced in sandbox with policy approval.
- **SATT:** Enforced on transform outputs prior to receipt generation.
- **QSDR:** Applied to recon results after kill-switch evaluation to avoid overexposure.
- **FASC:** Used when exporting calibration artifacts to external reviewers.
- **CIRW:** Used when sharing cluster candidates with external tenants.

## Auditability

Every constraint application records: policy identifier, constraint parameters, redacted fields, and resulting info-loss metric (where applicable).
