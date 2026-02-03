# Threat Model: Build Attestation

## Threats

### T1: Bucket Tampering
**Threat:** An attacker replaces an attestation in the cloud bucket.
**Mitigation:**
- Use bucket versioning.
- Enable object lock (WORM) where possible.
- Verify signatures (future phase).

### T2: Credential Leakage
**Threat:** Long-lived keys for bucket access are leaked.
**Mitigation:**
- Use OIDC keyless authentication from GitHub Actions.
- Scoped IAM policies (least privilege).

### T3: Provenance Confusion
**Threat:** Attestation for SHA A is mistakenly associated with built artifact for SHA B.
**Mitigation:**
- Embedded `git_sha` and `evidence_id` in the attestation.
- Deterministic IDs derived from SHA.

## Security Review Checklist
- [ ] OIDC token is requested with minimum scope.
- [ ] Bucket policy denies cross-tenant access.
- [ ] Scripts do not use non-deterministic inputs (clocks, random).
