# Supply Chain Assurance Runbook

This runbook describes the required controls and procedures for maintaining software supply chain integrity, including SBOM regeneration, signing method rotation, air-gapped validation, exception handling, and rollback.

## 1. SBOM Regeneration

1. **Trigger criteria:**
   - Any dependency upgrade or new dependency introduction.
   - Weekly scheduled regeneration for drift detection.
   - Prior to release candidates or security advisories.
2. **Generate SBOMs:**
   - Ensure a clean workspace: `git status` should be clean aside from the intended changes.
   - Run the workspace SBOM build (CycloneDX SPDX JSON):
     - `pnpm run sbom:generate` (or `make sbom` if available).
   - Verify artifacts land in `artifacts/sbom/` with timestamped filenames.
3. **Validate SBOMs:**
   - Run schema validation: `pnpm run sbom:validate`.
   - Scan for critical CVEs: `pnpm run sbom:scan` and review the report in `artifacts/sbom/reports`.
   - Confirm dependency provenance annotations (purl, checksums) are present.
4. **Attach to build:**
   - Publish SBOMs to the build registry or artifact store (e.g., OCI `:sbom` tag) alongside images.
   - Link the SBOM artifact path in the PR template’s Security/Compliance section.
5. **Recordkeeping:**
   - Update release notes with the SBOM hash (`sha256sum artifacts/sbom/*.json`).
   - Archive reports in compliance storage with retention ≥ 1 year.

## 2. Signing Method Rotation

1. **Rotation cadence:** Every 90 days or on key exposure events.
2. **Preparation:**
   - Generate new signing keys via `cosign generate-key-pair` (hardware-backed where available).
   - Store private keys in the HSM or sealed-secrets; distribute public keys through the trust store repo.
3. **Dual-publish window:**
   - Sign artifacts with both old and new keys for 7 days: `cosign sign --key <new> <image>` and repeat with `<old>`.
   - Publish updated `cosign.pub` references and supply chain policy bundles.
4. **Verification updates:**
   - Update admission policies/OPA rules to trust the new key fingerprint and schedule removal of the old fingerprint after the dual window.
   - Rotate CI secrets to the new key IDs.
5. **Close-out:**
   - Revoke the old key, document the revocation record, and notify downstream consumers.

## 3. Air-Gapped Validation

1. **Artifact export:**
   - Export build artifacts, SBOMs, signatures, and provenance attestations to removable media (`.tar.gz`).
   - Include verification scripts (`verify.sh`) pinned to specific tool versions.
2. **Offline verification steps:**
   - Validate signatures: `cosign verify --key cosign.pub <image>` using the exported public key.
   - Validate provenance: `cosign verify-attestation --type slsaprovenance <image>`.
   - Validate SBOM integrity: `cosign verify-blob --signature sbom.sig --key cosign.pub artifacts/sbom/*.json`.
3. **Environmental assurance:**
   - Run scanners in offline mode with cached CVE feeds; record scanner version and feed date.
   - Capture a checksum manifest before and after validation to detect tampering.
4. **Reporting:**
   - Store validation logs and manifests in the offline audit vault; sync summaries back to the main audit system when reconnected.

## 4. Exception Creation and Expiry

1. **When allowed:** Only for time-bound, risk-accepted deviations (e.g., temporary CVE suppressions or missing signatures) approved by the security owner.
2. **Create an exception:**
   - File an Exception ID in the risk register with scope, justification, owner, start date, and expiry.
   - Attach compensating controls (e.g., runtime detection, additional monitoring).
   - Reference the Exception ID in the PR template Security/Compliance section.
3. **Expiry and renewal:**
   - Default maximum duration: 30 days. Any renewal requires re-approval.
   - Schedule automated reminders 7 days before expiry.
   - Remove the exception from policy bindings and close the register entry after mitigation is complete.

## 5. Rollback Procedures

1. **Triggers:**
   - Signature validation failures, SBOM drift with new critical CVEs, or compromised keys.
2. **Rollback steps:**
   - Halt promotion and freeze deployments via feature flags or ArgoCD pause.
   - Revert to the last known good artifact and SBOM pairing: `helm rollback <release> <rev>` or re-pin image digest.
   - Re-enable verification policies pointing to the last trusted key and SBOM hash.
   - Notify stakeholders and incident response channels; open a post-incident record.
3. **Post-rollback hardening:**
   - Rotate affected keys, regenerate SBOMs, and re-run full verification before re-promoting.
   - Add regression checks to CI to prevent recurrence (e.g., mandatory SBOM validation gate).

## 6. Quick Validation Checklist

- [ ] Latest SBOM generated, validated, and attached to build
- [ ] Artifact signatures verified against current trust store
- [ ] Provenance attestations validated (SLSA-compliant)
- [ ] Air-gapped validation performed or scheduled
- [ ] No active exceptions, or valid Exception ID recorded with expiry
- [ ] Rollback plan reviewed and on-call aware
