# Security Waivers Register

**Purpose**: Track accepted security risks with documented justification, mitigation, and expiry.

**Owner**: Security Engineering Team
**Last Updated**: October 4, 2025

---

## Active Waivers

| ID | CVE/Issue | Severity | Component | Justification | Mitigation | Owner | Expiry Date | Status |
|----|-----------|----------|-----------|---------------|------------|-------|-------------|--------|
| - | - | - | - | - | - | - | - | Active |

*No active waivers currently*

---

## Waiver Template

When adding a new waiver, use this template:

```markdown
### Waiver ID: WAIV-YYYY-NNN

**CVE/Issue**: CVE-2024-XXXXX or GitHub Security Alert #123
**Severity**: Critical / High / Medium / Low
**Component**: package-name@version
**Discovered**: YYYY-MM-DD
**Expiry**: YYYY-MM-DD (max 90 days)

**Justification**:
- Why this vulnerability is accepted
- Business or technical reasons

**Mitigation**:
- Compensating controls in place
- Monitoring or detection mechanisms
- Network segmentation or access controls

**Owner**: @username
**Approved By**: @security-lead
**Status**: Active / Expired / Remediated
```

---

## Expired Waivers

| ID | CVE/Issue | Severity | Component | Expiry Date | Resolution |
|----|-----------|----------|-----------|-------------|------------|
| - | - | - | - | - | - |

*No expired waivers*

---

## Remediated Waivers

| ID | CVE/Issue | Severity | Component | Remediation Date | Resolution |
|----|-----------|----------|-----------|------------------|------------|
| - | - | - | - | - | - |

*No remediated waivers*

---

## Waiver Process

### 1. Request Waiver
- Open an issue with label `security-waiver`
- Fill out the waiver template
- Tag @security-team for review

### 2. Review & Approval
- Security team reviews justification
- Risk assessment performed
- Mitigation plan validated
- Approval granted or denied

### 3. Tracking
- Add to Active Waivers table
- Set expiry date (max 90 days)
- Add to security dashboard monitoring

### 4. Expiry & Review
- Weekly review of expiring waivers
- 7-day warning before expiry
- Auto-escalate on expiry
- Remediate or renew with new justification

---

## Acceptance Criteria

For a waiver to be accepted, it must have:

- ✅ Clear business or technical justification
- ✅ Documented mitigation or compensating controls
- ✅ Assigned owner
- ✅ Expiry date (≤ 90 days)
- ✅ Security team approval
- ✅ Regular review cadence

---

## Statistics

**Current Stats** (as of October 4, 2025):
- Active Waivers: 0
- Expired Waivers: 0
- Remediated Waivers: 0
- Average Time to Remediate: N/A

**SLO**:
- 0 critical vulnerabilities without waiver or remediation plan
- All waivers reviewed within 7 days of expiry
- 100% of expired waivers escalated

---

## Related Documentation

- Security Scanning Workflow: `.github/workflows/security-scans-sarif.yml`
- Code Scanning Results: https://github.com/BrianCLong/summit/security/code-scanning
- Vulnerability Alerts: https://github.com/BrianCLong/summit/security/dependabot

---

**Contact**: security-team@example.com
**Emergency**: security-incidents@example.com
