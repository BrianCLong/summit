# Provenance Wallets

## Purpose
Package export bundles with selective disclosure, provenance manifests, and licensing decisions for external sharing.

## Bundle Template
- `manifest.json`: hash tree with transform chain, policy decisions, signatures.
- `evidence/`: cited artifacts with checksums; redacted per disclosure tier.
- `authority.txt`: warrant/ticket reference, expiration, approving officer.
- `summary.md`: human-readable rationale, citations, and usage constraints.
- `checksums.txt`: SHA256 for all files; root hash matches ledger entry.

## Selective Disclosure
- Tiers: public summary, partner confidential, restricted (requires bilateral agreement).
- Fields masked or withheld based on tier; manifest includes redaction notes.
- Exports blocked if tier not aligned with license/TOS for source.

## Operational Notes
- Wallet generation requires successful ledger verification and cost guard check.
- Appeals captured in wallet metadata with outcome and reviewer signature.
- Store bundles in versioned object storage with retention policy and audit trail.
