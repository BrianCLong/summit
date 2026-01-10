# Transparency Log Service

## Responsibility

- Persist append-only records for artifact commitments and attestations.
- Provide verification queries over audit windows.

## Inputs

- Artifact metadata and commitment roots.
- Attestation references.
- Replay token digest.

## Outputs

- Record identifier and inclusion proof.
- Audit query responses.

## Observability

- Metrics: `transparency.append.count`, `transparency.verify.count`.
- Logs: record ID, artifact type.
