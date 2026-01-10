# Attestation Standard

Defines the attestation metadata used to bind capsules to trusted execution.

## Attestation Metadata

```yaml
attestation:
  attestation_id: <uuid>
  provider: <string>
  quote: <base64>
  verifier: <string>
  verified_at: <rfc3339>
  measurement: <hex>
  artifact_digests:
    - <sha256>
```

## Expectations

- Attestations link to witness records and capsules.
- Verifier identity and verification time are recorded.
- Invalid or missing attestations must be flagged in audit reports.
