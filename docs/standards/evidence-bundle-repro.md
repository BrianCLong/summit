# Evidence Bundle Standard

## Slug: evidence-bundle-repro

## Goal
To produce a deterministic, policy-enforced, and cryptographically verifiable evidence bundle for every release.

## Requirements

### Determinism
* Build artifacts must be byte-for-byte identical given the same source.
* Volatile data (timestamps, runner IDs) must be isolated in `stamp.json`.
* Evidence JSONs must use deterministic serialization (sorted keys).

### Policy Enforcement
* All evidence items must use an ID from the allowlist in `docs/governance/EVIDENCE_ID_POLICY.yml`.
* Unknown IDs cause CI failure.
* Missing required IDs cause CI failure unless waived.

### Cryptographic Verification
* All evidence JSONs must be signed.
* Signatures must be verified against pinned public keys.
* `evidence_index.json` must contain SHA256 hashes of all evidence items.

## Artifacts
* `artifacts/build/build.tgz`: Deterministic build output.
* `artifacts/stamp/stamp.json`: Volatile build metadata.
* `releases/<tag>/evidence_index.json`: Machine-readable index of evidence.
* `evidence/*.json`: Individual evidence files.
* `evidence/*.minisig`: Detached signatures.
