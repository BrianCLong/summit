# Label Manifest

Details the manifest structure exported by EBLE.

## Fields

- Manifest version and schema hash.
- Label bundle hash and per-label Merkle proofs.
- Label policy (per-field disclosure rules, redaction markers).
- Replay token binding to time window and dataset snapshot.
- Counterfactual delta metrics for excluded feeds/sources.
- Transparency log entry ID and optional TEE attestation.

## Disclosure

- Supports binder export for program reviews with selective field redaction.
- Verification hashes allow evaluators to validate labels without evidence access.
