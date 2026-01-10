# Witness Chain

Defines tamper-evident recording of execution artifacts for evaluator verification.

## Structure

- Hash-chained entries covering inputs, intermediate artifacts, outputs, policy decisions, budget events, and error states.
- Each entry references determinism token and component version.
- Optional Merkle tree for intermediate artifacts to reduce size.

## Properties

- Tamper evidence: any modification breaks chain.
- Selective disclosure: hashes enable verification without revealing content.
- Replay alignment: replay tokens link chain to dataset snapshots and time windows.

## Integration

- Capsules and evaluator components must emit witness chain references in metric proof objects.
- Transparency log stores digests for independent third-party verification.
- Witness chain artifacts are stored in the manifest and proof store.
