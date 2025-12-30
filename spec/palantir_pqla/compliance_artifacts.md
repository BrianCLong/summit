# Compliance Artifacts

## Contents

- Commitment to analytics request (hash of query + parameters).
- Policy decision identifier and evaluated ruleset version.
- Commitment to transformed output (hash or Merkle root) with disclosure constraint parameters.
- Determinism token (snapshot ID + seed + version set).
- Optional attestation quote for sandbox runtime.

## Ledger Integration

- Artifacts hash-chained in transparency log.
- Exportable with inclusion proofs and redaction markers.

## Counterfactuals

- Optional counterfactual outputs produced under alternative disclosure constraints with reported info-loss metrics to support business justification.
