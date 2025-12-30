# Witness Chains

Witness chains capture a verifiable sequence of commitments for intermediate results, enabling downstream auditing without exposing sensitive data.

## Structure

- **Ordered commitments:** hash commitments for each step (inputs, intermediates, outputs).
- **Metadata:** step type, timestamp, version identifiers, and optional disclosure flags.
- **Linkage:** each commitment includes the prior commitment hash to prevent reordering.

## Usage Patterns

- **Replay verification:** re-run computations to regenerate commitments and compare against the chain.
- **Redaction-aware:** disclosures may omit payloads while keeping commitments intact for verification.
- **Multi-party:** chains can include per-recipient segments with salted commitments to preserve scope isolation.
