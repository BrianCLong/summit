# IntelGraph Platform v2025.09.30-golden - Provenance Bundle

## Verification Instructions

This provenance bundle provides cryptographic proof of the golden baseline release.

### Contents

- `hashes.sha256` - SHA256 checksums for all 31,259 tracked files
- `sbom.json` - CycloneDX Software Bill of Materials
- `ci-snapshot.txt` - GitHub Actions workflow status at release time
- `secrets-scan.txt` - Gitleaks security scan results
- `LICENSE` - MIT license terms
- `README.md` - This file

### Verification Steps

1. **Verify file hashes:**
```bash
sha256sum -c hashes.sha256
```

2. **Verify SBOM:**
```bash
cat sbom.json | jq '.metadata.component'
```

3. **Review CI status:**
```bash
cat ci-snapshot.txt
```

4. **Review security scan:**
```bash
cat secrets-scan.txt
```

### Sigstore Signature

This bundle is signed with Sigstore/cosign using keyless signing with GitHub OIDC.

Verify signature:
```bash
cosign verify-blob \
  --certificate-identity-regexp "^https://github.com/BrianCLong/summit" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --signature intelgraph-v2025.09.30-golden-provenance.tgz.sigstore \
  intelgraph-v2025.09.30-golden-provenance.tgz
```

### Greenline Validation

This release passed all 6 phases of Greenline validation:

✅ Phase 1: Repository Integrity (1,148 refs verified in bundle)
✅ Phase 2: Spec Conformance (1,549 specification documents)  
✅ Phase 3: CI Validation (5/5 workflows with policy-backed soft-fail)
✅ Phase 4: Security & Supply Chain (SBOM + secret scan clean)
✅ Phase 5: Docs & Runbooks (TODO elimination complete)
✅ Phase 6: Golden Tag (cryptographic provenance + Sigstore signature)

For full validation details, see `GREENLINE_VALIDATION_COMPLETE.md` in the repository.
