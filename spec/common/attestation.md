# Attestation

Attestation binds artifact generation to trusted execution environments (TEE) to prove integrity
of compute and inputs.

## Attestation Envelope

- **Quote:** TEE attestation quote over the artifact digest.
- **Measurements:** platform measurement (PCRs) and code hash.
- **Nonce:** replay-protection nonce derived from the replay token.

## Verification Flow

1. Validate quote signature with the TEE vendor public key.
2. Compare measurements to allow-listed hashes.
3. Confirm nonce equals the replay token digest.
4. Attach the attestation summary to the artifact metadata.

## Failure Handling

- Reject artifacts with unverifiable quotes.
- Emit compliance alerts when measurements drift.

## Storage

- Store attestation envelopes with artifacts in the transparency log.
- Retain a compact copy of verification results for quick audits.
