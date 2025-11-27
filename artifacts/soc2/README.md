# SOC2 Compliance Artifacts

This directory contains the evidence bundle for the SOC2 Type II audit of SummitIntelEvo.

## Contents

- `evidence.json`: Machine-readable evidence log mapped to Trust Services Criteria.
- `audit_trail.log`: (Mock) Immutable log of system changes.
- `policy_snapshot.rego`: (Mock) Snapshot of active OPA policies.

## Validation

All artifacts are cryptographically hashed and anchored to the `ProvenanceLedger`.

To verify integrity:

```bash
summit-cli audit verify --path ./artifacts/soc2
```
