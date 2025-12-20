# Supply Chain Integrity Runbook

This runbook describes the operational path to maintain supply-chain assurance across software artifacts. It covers SBOM regeneration, signing method rotation, air-gapped validation, exception handling, and rollback. Follow these steps in order and record evidence in the release record.

## Roles & Preconditions
- **Roles:** release captain (or delegate), security on-call, service owner.
- **Prereqs:** working `cosign`, `syft`, `grype`, offline trust bundle (public keys, policies), access to provenance store, and CI credentials to update signing secrets.
- **Artifacts to track:** artifact digest, SBOM hash, attestation signature(s), vulnerability scan report ID, exception ticket (if any).

## SBOM Regeneration
1. **Triggers:** new/updated dependency or base image, weekly cadence for long-lived releases, or security advisory for a transitive package.
2. **Build and generate:**
   - Build the release artifact: `pnpm run build` or service-specific target.
   - Generate SPDX JSON SBOM: `syft <artifact> -o spdx-json > sbom.json`.
3. **Attest and publish:**
   - Sign SBOM attestation: `cosign attest --key cosign.key --predicate sbom.json --type spdx <artifact-ref>`.
   - Upload SBOM + attestation to provenance store and link digest to the release record.
4. **Validate:**
   - Vulnerability scan: `grype sbom:sbom.json --fail-on high` (or policy severity).
   - Record SBOM digest, cosign bundle, grype report ID, and CI run ID in the checklist.
5. **Success criteria:** SBOM present, signed, uploaded, and scan passes policy. Stale SBOMs (pre-dependency change) are invalid.

## Signing Method Rotation
1. **Triggers:** key compromise, cryptoperiod expiry, algorithm deprecation, or mandated trust policy change.
2. **Prepare:**
   - Provision new key pair in HSM/KMS; tag owner, purpose, and expiry.
   - Update CI/CD secrets and K8s sealed-secrets for `cosign`/`notation` with new key material.
   - Establish a dual-signing window (old + new) for at least one release.
3. **Execute:**
   - Dual sign artifacts: `cosign sign --key ${OLD_KEY}` and `cosign sign --key ${NEW_KEY}` for the same digest.
   - Publish updated trust policy and distribute new public keys to verifiers and air-gapped mirrors.
   - After dual window, switch verification policy to require the new key and mark the old key revoked/retired.
4. **Validate & audit:**
   - Verify every release artifact: `cosign verify --key ${NEW_PUB} <digest>`.
   - Record rotation window, keys involved, verification evidence, and policy update PRs in the change log.

## Air-Gapped Validation
1. **Objective:** prove artifact provenance without internet access.
2. **Inputs:** artifact tarballs, SBOM, signatures/attestations, public keys/trust policy bundle, verification tools with checksums.
3. **Procedure:**
   - Transfer inputs via approved media; verify transfer integrity (`sha256sum --check checksums.txt`).
   - Verify signatures offline: `cosign verify --key <pubkey> <artifact>` and `cosign verify-attestation --type spdx --key <pubkey> <artifact>`.
   - Validate SBOM offline with pre-synced CVE data: `grype sbom:sbom.json --offline`.
   - Log results in the offline validation record and sync back to central inventory during the next connected window.
4. **Controls:** restricted media custody, hash chain for transfers, retained offline logs, and periodic tool checksum verification.

## Exceptions (Creation & Expiry)
1. **When needed:** temporary waiver for failing SCA/SAST, unavailable signer, or validated tooling outage.
2. **Request:** open an exception ticket capturing owner, risk assessment, affected artifacts/digests, scope, duration, and compensating controls.
3. **Approval & enforcement:**
   - Security and service owners must approve before merging/deploying.
   - CI gates must validate a non-expired exception ID before bypassing supply-chain checks.
4. **Expiry & closure:**
   - Exceptions auto-expire on the defined end date; deployments fail if expired.
   - Regenerate SBOM/signatures, rerun scans, and attach evidence to close the ticket; remove bypass flags.

## Rollback
1. **Triggers:** failed verification, revoked key, critical CVE in SBOM scan, or expired/invalid exception.
2. **Action plan:**
   - Halt rollout and freeze artifact promotion.
   - Restore last known-good artifact digest and its SBOM/signature pair from provenance store.
   - Revert trust policy changes tied to recent key rotations; update revocation lists.
   - Re-run `cosign verify` and `grype` on restored artifacts to confirm integrity.
3. **Post-rollback:** publish incident report with timeline, root cause, and corrective actions (e.g., patched dependencies, new keys). Schedule remediation and a follow-up rotation/regeneration if required.

## Contacts & References
- Security on-call: `security-oncall@example.com`
- Provenance service: `provenance-team@example.com`
- Tooling docs: `tools/supply-chain/README.md` (update when tooling or trust policies change)
