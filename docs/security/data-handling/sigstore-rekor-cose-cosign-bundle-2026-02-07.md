# Sigstore Smoke Evidence Data Handling (2026-02-07)

**Item slug:** `sigstore-rekor-cose-cosign-bundle-2026-02-07`
**Classification:** Internal - Security Evidence

## Never Log

- Cosign bundle contents in full
- Signatures, cert chains, or Rekor payloads beyond hashes
- Raw Rekor response bodies (store hash + status only)

## Allowed Evidence

- Deterministic report JSON (`summit.sigstore.smoke.v1`)
- Fixture hashes and case identifiers
- Rekor HTTP status codes without payloads

## Retention

- CI artifacts: retain `artifacts/sigstore/*.report.json` only
- No persistent storage of fixtures beyond the repo

## Redaction Rules

- Replace payload bodies with SHA-256 hashes
- Truncate error messages to deterministic summaries when possible

## Compliance Links

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
