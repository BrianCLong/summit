---
name: Compliance Change
about: Changes to compliance controls, evidence, or audit requirements
title: '[COMPLIANCE] '
labels: 'area/compliance, risk/high'
assignees: ''
---

## Summary

<!-- What compliance control, evidence, or audit requirement is being changed? -->

## Type of Compliance Change

- [ ] Control registry update (`evidence/CONTROL_REGISTRY.json`)
- [ ] Evidence automation (`scripts/generate-*.ts`)
- [ ] Audit trail modification (retention, schema, storage)
- [ ] Compliance framework mapping (SOC 2, ISO 27001, NIST, etc.)
- [ ] Exception/waiver documentation

## Control Reference

<!-- Which compliance control(s) are affected? -->

- **Control ID**: <!-- e.g., CC1.1, A.9.1.2 -->
- **Framework**: <!-- e.g., SOC 2, ISO 27001 -->
- **Control Description**:

## Rationale

<!-- Why is this compliance change necessary? -->

## Changes

<!-- Detailed description of compliance changes -->

-
-
-

## Evidence & Validation

<!-- Required for all compliance changes -->

- [ ] Control tests updated/added
- [ ] Evidence automation script created/updated
- [ ] Evidence generation validated (run script, verify output)
- [ ] Control mapping verified (CONTROL_CROSSWALK)
- [ ] Documentation updated (`docs/ga/`, `evidence/`)

**Validation Commands**:
```bash
./scripts/generate-evidence-bundle.sh --version test --output /tmp/evidence-test.tar.gz
./scripts/verify-control-coverage.ts
npm run check:compliance
```

## Evidence Artifacts

<!-- What artifacts does this generate? -->

- **Artifact Type**: <!-- SBOM, audit log export, scan report, etc. -->
- **Location**:
- **Retention**: <!-- 7 years, 2 years, etc. -->
- **Format**: <!-- JSON, CSV, PDF, etc. -->

## Automatable Evidence

<!-- Compliance principle: evidence must be automatable -->

- [ ] Evidence is **100% automated** (no manual steps)
- [ ] Evidence is **reproducible** (same input → same output)
- [ ] Evidence is **machine-readable** (JSON, CSV, not PDF/screenshots)
- [ ] Evidence is **verifiable** (signed, hashed, or provenance-tracked)

<!-- If NOT automatable, explain why and document exception -->

**Exception Reason** (if not automatable):


## Audit Implications

- [ ] Affects annual audit scope
- [ ] Requires auditor notification
- [ ] Changes audit trail format/schema
- [ ] Impacts retention policy

## Compliance Officer Approval

<!-- Required for all compliance changes -->

- [ ] Compliance Officer approval: @compliance-officer
- [ ] Security Lead approval: @security-lead
- [ ] Release Captain approval: @release-captain

## Rollback Plan

<!-- How to rollback this compliance change? -->

- Revert control:
- Impact of rollback:
- Compliance gap if rolled back:

## Related Documents

<!-- Link to control specifications, audit reports, frameworks -->

- **Control Specification**:
- **Framework Standard**:
- **Prior Audit Report**:
- **ADR** (if applicable):

---

**Pre-Merge Checklist** (for reviewers):

- [ ] Compliance impact fully understood
- [ ] Evidence automation validated (run script)
- [ ] Control mapping verified
- [ ] Audit implications reviewed
- [ ] Compliance officer approval obtained
- [ ] Required approvals obtained (2+ from compliance team)
