# Witness Chain Profile

Defines chaining rules for witness records emitted by services and modules.

## Requirements

- **Per-step witness**: each operation produces input/output commitments.
- **Hash chaining**: witness records linked via previous hash to provide tamper evidence.
- **Attestation hook**: optional TEE quote or signing key reference per record.
- **Policy binding**: include policy decision identifier for access/egress enforcement.

## Usage

- Capsule artifacts reference the terminating witness hash.
- Transparency logs ingest witness hashes for publication.
