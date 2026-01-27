# Marketing Claims Registry

> This registry tracks all public marketing claims and their supporting evidence.
> Updated automatically by the `claim-evidence-matrix.yml` workflow.

## Overview

Every marketing claim made about the Summit platform should be:
1. **Registered** in this document
2. **Supported** by automated CI evidence
3. **Verified** weekly via the claim-evidence workflow

---

## Active Claims

### Security Claims

| Claim ID | Statement | Evidence Source | Last Verified | Status |
|----------|-----------|-----------------|---------------|--------|
| SEC-001 | "Enterprise-grade security scanning" | `ci-security.yml`, `codeql.yml` | Auto | ✅ Active |
| SEC-002 | "SBOM for supply chain transparency" | `release-ga.yml` (SBOM generation) | Auto | ✅ Active |
| SEC-003 | "Secret detection in CI/CD" | `gitleaks.toml`, pre-commit hooks | Auto | ✅ Active |
| SEC-004 | "SLSA provenance attestation" | `supply-chain-attest.yml` | Auto | ✅ Active |

### Compliance Claims

| Claim ID | Statement | Evidence Source | Last Verified | Status |
|----------|-----------|-----------------|---------------|--------|
| CMP-001 | "SOC 2 control verification" | `ci.yml` (soc-controls job) | Auto | ✅ Active |
| CMP-002 | "Policy-as-Code governance" | `governance/policies/` (OPA) | Auto | ✅ Active |
| CMP-003 | "Automated compliance evidence" | `ga-evidence-pack.yml` | Auto | ✅ Active |

### Performance Claims

| Claim ID | Statement | Evidence Source | Last Verified | Status |
|----------|-----------|-----------------|---------------|--------|
| PRF-001 | "Continuous performance testing" | `perf.yml`, `ci.yml` (perf-smoke) | Auto | ✅ Active |
| PRF-002 | "80%+ test coverage" | `ci.yml` (coverage-gate) | Auto | ✅ Active |

### Quality Claims

| Claim ID | Statement | Evidence Source | Last Verified | Status |
|----------|-----------|-----------------|---------------|--------|
| QUA-001 | "TypeScript strict mode" | `tsconfig.json`, `ci.yml` | Auto | ✅ Active |
| QUA-002 | "Automated code quality gates" | `ci.yml`, pre-commit hooks | Auto | ✅ Active |
| QUA-003 | "End-to-end testing" | `e2e-tests.yml`, Playwright | Auto | ✅ Active |

### Accessibility Claims

| Claim ID | Statement | Evidence Source | Last Verified | Status |
|----------|-----------|-----------------|---------------|--------|
| A11Y-001 | "WCAG 2.1 AA compliance testing" | `a11y-keyboard-smoke.yml` | Auto | ✅ Active |

---

## Claim Status Definitions

| Status | Meaning |
|--------|---------|
| ✅ Active | Claim is verified by automated CI evidence |
| ⚠️ Pending | Claim needs evidence automation |
| ❌ Unverified | No automated verification exists |
| 🔄 Review | Claim accuracy under review |

---

## Adding New Claims

When adding a new marketing claim:

1. **Register the claim** in this document with a unique ID
2. **Identify evidence** - What CI workflow or artifact supports this claim?
3. **Automate verification** - Ensure CI produces traceable evidence
4. **Link evidence** - Update the Evidence Source column

### Claim ID Format

```
{CATEGORY}-{NUMBER}

Categories:
- SEC: Security
- CMP: Compliance
- PRF: Performance
- QUA: Quality
- A11Y: Accessibility
- FEA: Features
- SCA: Scalability
```

---

## Evidence Requirements

Each claim must be backed by at least one of:

1. **CI Workflow** - Automated test/check that runs on every PR or release
2. **Artifact** - Generated report, SBOM, or attestation
3. **Documentation** - Technical documentation with version control
4. **Third-party Audit** - External verification (for compliance claims)

---

## Verification Schedule

| Frequency | Verification Type |
|-----------|-------------------|
| Per PR | Unit tests, lint, type checks |
| Per Release | SBOM, provenance, evidence pack |
| Weekly | `claim-evidence-matrix.yml` workflow |
| Quarterly | Manual review of all claims |

---

## Historical Claims (Deprecated)

| Claim ID | Statement | Deprecation Date | Reason |
|----------|-----------|------------------|--------|
| _None yet_ | | | |

---

## Audit Trail

| Date | Action | Claim IDs | Author |
|------|--------|-----------|--------|
| 2026-01-27 | Initial registry created | All | Automated |

---

*This document is automatically verified by the `claim-evidence-matrix.yml` workflow.*
*Last generated: 2026-01-27*
