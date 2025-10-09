# feat(ci): Cosign verify step required on protected branches

## Description
Add mandatory cosign verification step in CI pipeline for all protected branches. This ensures only properly signed and attested images can be deployed to production environments.

## Acceptance Criteria
- [ ] Add cosign verify step to compose-boot CI workflow
- [ ] Require successful verification for all tagged images
- [ ] Fail fast on signature verification failures
- [ ] Document key management and rotation procedures
- [ ] Add attestation verification for SBOM and SLSA provenance

## Implementation Notes
- Use cosign-installer GitHub Action
- Verify both image signatures and SBOM attestations
- Handle key rotation scenarios gracefully
- Consider keyless signing for future improvements

## Task List
- [ ] Install cosign in CI environment
- [ ] Add signature verification step
- [ ] Add attestation verification step
- [ ] Configure failure handling
- [ ] Update security documentation
- [ ] Test with both signed and unsigned images