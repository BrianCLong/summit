# Execution Attestation (Optional)

**Purpose:** Bind runtime measurements to a trace/evidence digest using Trusted Execution
Environments (TEEs) when higher assurance is required.

## Attestation Payload

```json
{
  "attestation_id": "att_...",
  "tee_type": "sgx|sev|tdx",
  "measurement": "sha256(binary+config)",
  "evidence_digest": "sha256(bundle+witness)",
  "issued_at": "2025-12-30T23:59:00Z",
  "verifier": "attestation-service",
  "quote": "base64..."
}
```

## Verification Steps

1. Validate the quote with the TEE vendor verifier.
2. Compare `measurement` against an allowlist of approved builds.
3. Ensure `evidence_digest` matches the evidence bundle + witness chain.

## Usage

- Include attestation payload in attribution artifacts or scan capsules.
- Store attestations in the audit ledger for later review.
