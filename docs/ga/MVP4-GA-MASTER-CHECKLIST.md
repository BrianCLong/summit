# MVP4 GA Master Checklist

**Status**: 🟡 In Progress
**Target Date**: 2026-01-15
**Owner**: Release Engineering

## 1. Supply Chain Security (Hardened)

- [x] **Deterministic Builds**: Build outputs are bitwise reproducible (normalized timestamps, canonical JSON).
- [x] **Drift Detection**: CI safeguards prevent uncommitted changes in release artifacts.
- [x] **Policy Enforcement**: `evidence-bundle.policy.json` strictly enforces required manifests and data fields.
- [x] **Non-Repudiation**: Evidence bundles are signed using Keyless OIDC (Cosign) rooted in GitHub Actions identity.

### Verification

```bash
# Verify the release bundle (StrictMode + DriftCheck)
node scripts/release/verify-release-bundle.mjs --path dist/release --strict --regenerate-and-compare --tag v1.0.0 --sha <COMMIT_SHA>

# Local Verification (Skip Signature if offline)
REQUIRE_SIGNATURE=false node scripts/release/verify-release-bundle.mjs --path dist/release --strict
```

## 2. Security Gates

- [x] **Secret Scanning**: Zero detected secrets in `main` branch.

- [x] **Vulnerability Management**: No critical CVEs in production dependencies (mitigated by overrides and approved waivers).

- [ ] **Access Control**: Production deployment keys validated.

## 3. Operational Readiness

- [ ] **Smoke Tests**: `make smoke` passes in clean environment.
- [ ] **Documentation**: Release notes and changelogs updated.
