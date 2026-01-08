# Release Captain Attestation

## Release Information

| Field               | Value          |
| ------------------- | -------------- |
| **Release Version** | [e.g., v2.5.0] |
| **Release Date**    | [YYYY-MM-DD]   |
| **Release Captain** | [Name]         |
| **Git Commit SHA**  | [40-char SHA]  |
| **CI Build Number** | [Build ID]     |

---

## Pre-Release Checklist

### Quality Gates

- [ ] All CI hard gates passed (lint, typecheck, build, tests)
- [ ] Test coverage meets minimum threshold (80%)
- [ ] No critical security vulnerabilities detected
- [ ] Schema snapshot tests passed (no breaking changes)
- [ ] Governance bypass tests passed

### Governance & Provenance

- [ ] GovernanceVerdict is mandatory in all DataEnvelope responses
- [ ] isSimulated flag is present on all data outputs
- [ ] Provenance is included in all API responses
- [ ] Export bundles include full provenance chain

### Documentation

- [ ] CHANGELOG updated with release notes
- [ ] API versioning documented (if breaking changes)
- [ ] Threat models reviewed and updated
- [ ] Runbooks updated for new features

### Security

- [ ] Security scan completed (Trivy, Gitleaks)
- [ ] No secrets in codebase
- [ ] Dependencies updated and audited
- [ ] Threat models current

---

## Attestation Statement

I, [Release Captain Name], attest that:

1. **Quality Assurance**: All automated quality gates have passed, and I have reviewed the CI artifacts.

2. **Governance Compliance**: The GovernanceVerdict is mandatory on all API outputs, and governance bypass is not possible in the released code.

3. **Data Integrity**: All data outputs include provenance metadata, and the isSimulated flag is correctly set.

4. **Security Review**: I have reviewed the security scan results and confirmed no critical vulnerabilities exist.

5. **Documentation**: All required documentation has been updated for this release.

6. **SOC 2 Compliance**: This release maintains compliance with SOC 2 Trust Services Criteria as documented in the control mapping.

---

## Signature

**Release Captain**: ****\*\*\*\*****\_****\*\*\*\*****

**Date**: ****\*\*\*\*****\_****\*\*\*\*****

**Digital Signature/GPG Key ID**: ****\*\*\*\*****\_****\*\*\*\*****

---

## Verification

To verify this attestation:

1. Verify the merge-safe artifact in CI:

   ```bash
   curl -s https://ci.example.com/artifacts/merge-safe-artifact.json | jq .
   ```

2. Verify the commit signature:

   ```bash
   git verify-commit [COMMIT_SHA]
   ```

3. Verify the release artifact signature:
   ```bash
   cosign verify --key cosign.pub ghcr.io/intelgraph/server:[VERSION]
   ```

---

## Audit Trail

| Action                  | Actor      | Timestamp   | Artifact                 |
| ----------------------- | ---------- | ----------- | ------------------------ |
| CI Gates Passed         | CI System  | [timestamp] | merge-safe-artifact.json |
| Code Review Approved    | [Reviewer] | [timestamp] | PR #[number]             |
| Security Scan Completed | Trivy      | [timestamp] | scan-results.json        |
| Release Signed          | [Captain]  | [timestamp] | this document            |

---

**SOC 2 Controls**: CC7.1, CC7.2, CC8.1, PI1.4
