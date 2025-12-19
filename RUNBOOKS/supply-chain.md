# Supply Chain Integrity Runbook

This runbook documents the operational procedures to regenerate SBOMs, rotate signing methods, validate artifacts in air-gapped environments, manage exceptions, and perform safe rollbacks.

## SBOM Regeneration

1. **Trigger**: new dependency, base image update, or security advisory for a transitive package.
2. **Tools**: `syft` for SBOM generation, `cosign attest` for attaching SBOM, and `grype` for validation.
3. **Procedure**:
   - Build production artifacts (containers/bundles): `pnpm run build` or the service-specific build target.
   - Generate SBOM: `syft <artifact> -o json > sbom.json` (use SPDX JSON output for interchange).
   - Sign and attest SBOM: `cosign attest --key cosign.key --predicate sbom.json --type cyclonedx <artifact-ref>`.
   - Upload SBOM to provenance store and link digest to the release record.
4. **Validation**:
   - Scan SBOM with `grype sbom:sbom.json` and block if severity ≥ configured policy.
   - Record SBOM digest, cosign signature, grype report ID, and the build run ID in the release checklist.
5. **Cadence**: regenerate for every release candidate and any dependency hotfix. Never reuse a stale SBOM after dependency updates.

## Signing Method Rotation

1. **Trigger**: key compromise, cryptoperiod expiry, algorithm deprecation, or policy change (e.g., SHA-256 → SHA-384).
2. **Preparation**:
   - Generate new key pair in HSM or KMS; tag with purpose, owner, and expiry.
   - Update `cosign`/`notation` configs in CI secrets and K8s sealed-secrets.
   - Create dual-signing window (old + new) for at least one release to preserve verification continuity.
3. **Execution**:
   - Enable dual-signing in pipelines: `cosign sign --key ${OLD_KEY}` and `cosign sign --key ${NEW_KEY}` for the same digest.
   - Publish updated trust policy and distribute new public keys to verifiers and air-gapped mirrors.
   - Rotate verification policy to require the new key after the dual window closes.
4. **Validation & Audit**:
   - Verify signatures for all release artifacts: `cosign verify --key ${NEW_PUB} <digest>`.
   - Record rotation window, keys involved, verification evidence, and policy update PR links in the change log.

## Air-Gapped Validation

1. **Objective**: verify provenance without internet access.
2. **Inputs**: artifact tarballs, SBOM, signatures, public keys/trust policy, and verification tools packaged with checksums.
3. **Procedure**:
   - Transfer inputs via approved media with checksum verification (e.g., `sha256sum --check`).
   - Use offline `cosign verify --key <pubkey> <artifact>` and `cosign verify-attestation` for SBOM.
   - Validate SBOM locally: `grype sbom:sbom.json --offline` with pre-synced CVE feeds.
   - Record results in the offline validation log and sync back to central inventory on next connected window.
4. **Controls**: restrict media to approved operators, log hash chain for transfers, and archive offline validation reports.

## Exceptions (Creation & Expiry)

1. **When Needed**: temporary waiver for failing SCA/SAST, unavailable signer, or tooling outage.
2. **Request Process**:
   - Open an exception ticket with owner, risk assessment, affected artifacts, duration, and compensating controls.
   - Obtain approvals from security and service owners; attach ticket ID to PRs and deployment records.
3. **Enforcement**:
   - CI gates must check for a valid exception ID before bypassing supply-chain checks.
   - Exceptions auto-expire at the defined end date; deployment fails if expired.
4. **Closure**:
   - Remove bypass flags, regenerate SBOM/signatures, and document validation evidence.
   - Mark the exception ticket as resolved and link to verification logs.

## Rollback

1. **Trigger**: failed verification, revoked key, CVE critical finding, or invalid/expired exception.
2. **Steps**:
   - Halt rollout and freeze artifact promotion.
   - Restore last known-good artifact digest and SBOM signature pair.
   - Revert trust policy changes if related to key rotation; keep revocation list updated.
   - Re-run validation (`cosign verify`, `grype`) on the restored artifacts.
3. **Post-Rollback Actions**:
   - Publish incident report with timeline and corrective actions.
   - Schedule remediation for the root cause (e.g., regenerate SBOM with patched dependencies, reissue keys).

## Contacts & References

- Security on-call: `security-oncall@example.com`
- Provenance service: `provenance-team@example.com`
- Tooling docs: `tools/supply-chain/README.md` (update when tooling changes)
