# Hotfix Lane Policy

**Version:** 1.0.0
**Last Updated:** 2026-01-09
**Status:** Active

This document defines the Hotfix Lane - an emergency release pathway for critical patches (`vX.Y.Z+1`) with evidence reuse semantics and governance waiver mechanisms.

---

## Overview

The Hotfix Lane enables rapid production releases when:
- A critical security vulnerability requires immediate patching
- A production outage necessitates emergency fixes
- A severity P0/P1 incident requires expedited deployment

Hotfixes bypass the standard RC → GA promotion cycle but maintain audit trails, evidence linkage, and time-bounded governance.

---

## Core Principles

1. **Evidence Reuse, Not Rebuild**: Hotfixes leverage evidence from the parent GA release whenever possible
2. **Minimal Change Scope**: Only changes directly addressing the incident are permitted
3. **Strict Time Bounds**: All waivers expire automatically (max 7 days)
4. **Post-Mortem Required**: Every hotfix requires a post-mortem within 24 hours
5. **Two-Person Approval**: Environment gates enforce dual-approval for all production releases

---

## Evidence Reuse Semantics

### Inheritance Model

When creating a hotfix for `vX.Y.Z`, the following evidence from the parent release can be reused:

| Evidence Type | Reuse Policy | Conditions |
|---------------|--------------|------------|
| SBOM | Inherit | If no dependency changes |
| Security Scan | Inherit | If no new code paths |
| Compliance Attestation | Partial | Scope limited to unchanged components |
| Performance Baseline | Inherit | If no performance-affecting changes |
| Test Coverage | Delta | Only new/modified code requires coverage |

### Evidence Bundle Structure

A hotfix evidence bundle contains:

```
hotfix-evidence/
├── provenance.json          # Hotfix-specific provenance
├── parent_linkage.json      # Link to parent GA release
├── delta_manifest.json      # What changed from parent
├── inherited/               # Reused evidence from parent
│   ├── sbom-cyclonedx.json
│   ├── security-scan.json
│   └── compliance.json
├── delta/                   # New evidence for changed code
│   ├── delta-security-scan.json
│   ├── delta-test-results.json
│   └── delta-coverage.json
└── SHA256SUMS
```

### Parent Linkage Schema

```json
{
  "version": "1.0.0",
  "parent": {
    "tag": "v4.1.2",
    "commit_sha": "abc123...",
    "release_url": "https://github.com/org/repo/releases/tag/v4.1.2",
    "evidence_sha256": "sha256:..."
  },
  "hotfix": {
    "tag": "v4.1.3",
    "commit_sha": "def456...",
    "base_commit": "abc123...",
    "cherry_picks": ["ghi789..."],
    "justification": "CVE-2026-XXXX remediation",
    "ticket_url": "https://issues.example.com/SEC-1234"
  },
  "evidence_inheritance": {
    "sbom": "inherited",
    "security_scan": "delta_only",
    "compliance": "partial",
    "test_coverage": "delta_only"
  }
}
```

---

## Emergency Governance Waivers

### Waiver Types

| Type | Max Duration | Approval Required | Use Case |
|------|--------------|-------------------|----------|
| `gate-bypass` | 7 days | 2 approvers | Skip specific GA gate checks |
| `coverage-exception` | 7 days | 2 approvers | Allow reduced test coverage |
| `security-exception` | 72 hours | CISO + 1 | Known vulnerability deferral |
| `compliance-exception` | 7 days | Compliance Lead + 1 | Compliance check deferral |

### Waiver Schema

Waivers are defined in `docs/releases/_state/hotfix_waivers.json`:

```json
{
  "version": "1.0.0",
  "waivers": [
    {
      "id": "HW-2026-001",
      "type": "gate-bypass",
      "hotfix_tag": "v4.1.3",
      "gates_waived": ["integration-tests", "e2e-smoke"],
      "justification": "Emergency CVE patch - integration tests not affected",
      "risk_assessment": "low",
      "mitigations": [
        "Manual verification of affected endpoints",
        "Canary deployment with 5% traffic"
      ],
      "created_at": "2026-01-09T10:00:00Z",
      "expires_at": "2026-01-16T10:00:00Z",
      "approved_by": ["@alice", "@bob"],
      "ticket_url": "https://issues.example.com/SEC-1234",
      "status": "active"
    }
  ]
}
```

### Waiver Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────▶│   Pending   │────▶│   Active    │────▶│   Expired   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Rejected   │     │  Revoked    │
                    └─────────────┘     └─────────────┘
```

### Expiry Enforcement

- **Automatic Expiry**: Waivers expire at `expires_at` timestamp - no extensions allowed
- **CI Enforcement**: `verify-waivers.sh` runs on every push; fails if expired waivers referenced
- **Audit Trail**: All waiver state changes logged to `docs/releases/_state/waiver_audit_log.json`
- **Alerting**: Slack notification 24h before waiver expiry

---

## Hotfix Workflow

### Prerequisites

1. Parent GA release exists (e.g., `v4.1.2`)
2. Hotfix branch created from parent tag
3. Justification and ticket URL prepared
4. Two approvers available for environment gate

### Step-by-Step Process

1. **Create Hotfix Branch**
   ```bash
   git checkout v4.1.2
   git checkout -b hotfix/v4.1.3
   ```

2. **Apply Minimal Fix**
   - Only changes addressing the incident
   - No refactoring, no "while we're here" changes

3. **Run Delta Verification**
   ```bash
   pnpm hotfix:verify --parent v4.1.2
   ```

4. **Request Waivers (if needed)**
   - Edit `docs/releases/_state/hotfix_waivers.json`
   - Get approvals in PR comments
   - Merge waiver before hotfix release

5. **Trigger Hotfix Release**
   ```bash
   gh workflow run hotfix-release.yml \
     -f version=4.1.3 \
     -f commit_sha=$(git rev-parse HEAD) \
     -f parent_tag=v4.1.2 \
     -f justification="CVE-2026-XXXX remediation" \
     -f ticket_url=https://issues.example.com/SEC-1234 \
     -f risk_level=high
   ```

6. **Approve in Environment Gate**
   - Two reviewers must approve the `hotfix-release` environment
   - Reviewers verify waiver validity and justification

7. **File Post-Mortem**
   - Create `docs/releases/HOTFIX_POSTMORTEMS/v4.1.3.md` within 24 hours
   - Include root cause, timeline, and prevention measures

---

## Security Considerations

### Attack Surface Reduction

- Hotfixes only modify code directly related to the fix
- Evidence reuse reduces CI attack surface (fewer builds)
- Delta scanning focuses on changed code paths

### Audit Requirements

All hotfix releases must include:
- Signed provenance (Sigstore/cosign)
- Parent linkage with cryptographic verification
- Waiver audit log entries
- Approver identities (captured in GitHub audit log)

### Rollback Procedure

If a hotfix introduces issues:

1. **Immediate Rollback**
   ```bash
   gh release edit v4.1.3 --prerelease
   ```

2. **Notify Stakeholders**
   ```bash
   # Trigger rollback alert
   gh workflow run hotfix-rollback-alert.yml -f tag=v4.1.3
   ```

3. **Restore Parent Release**
   - Direct users to parent GA release
   - File rollback post-mortem

---

## Metrics and SLOs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Hotfix Time to Release | < 4 hours | > 6 hours |
| Post-Mortem Completion | 100% within 24h | > 48h |
| Waiver Expiry Violations | 0 | Any |
| Evidence Reuse Rate | > 80% | < 50% |

---

## Related Documentation

- [Promotion Policy](./PROMOTION_POLICY.md)
- [GA Pipeline](../ci/RELEASE_GA_PIPELINE.md)
- [Change Freeze Policy](../ci/CHANGE_FREEZE_MODE.md)
- [Post-Mortem Template](./HOTFIX_POSTMORTEMS/_template.md)
- [Waiver Audit Log](../releases/_state/waiver_audit_log.json)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-09 | Initial release |
