# Release Compliance Checklist

This checklist must be completed for every GA release.

## Pre-Release

- [ ] **Control Catalog Validation**: `npx tsx scripts/compliance/validate_control_catalog.ts` passes.
- [ ] **Evidence Map Validation**: `npx tsx scripts/compliance/validate_control_evidence_map.ts` passes.
- [ ] **Drift Detection**: `npx tsx scripts/compliance/detect_evidence_drift.ts` shows no drift.
- [ ] **Security Scan**: Latest security scan reports are clean or have approved exceptions.

## Release Process

- [ ] **Export Evidence Bundle**: Run `npx tsx scripts/release/export_evidence_bundle.ts`.
- [ ] **Verify Bundle**: Run `npx tsx scripts/release/verify_evidence_bundle.ts`.
- [ ] **Generate Snapshot**: Run `npx tsx scripts/compliance/generate_compliance_snapshot.ts`.
- [ ] **Sign Artifacts**: Sign the bundle checksums with Cosign (if configured).

## Post-Release

- [ ] **Upload Artifacts**: Upload `artifacts/release-bundles/<SHA>` and `artifacts/compliance-snapshot/<SHA>` to secure storage (S3/GCS).
- [ ] **Notify Governance**: Alert the Governance team of the new release snapshot.
- [ ] **Retain Evidence**: Ensure the bundle is retained for the required compliance period (e.g., 7 years).

## Exceptions

Any failures in the above steps require a documented exception approved by the CISO or Head of Engineering.
