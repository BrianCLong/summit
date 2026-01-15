# Emergency Hotfix Override

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Emergency Hotfix Override path enables rapid production releases when standard GA pipeline timing is not acceptable. It maintains governance controls while allowing faster time-to-production for critical fixes.

### Key Properties

- **Faster, not uncontrolled**: Still enforces integrity checks, provenance, and approval
- **Explicit justification**: Requires documented reason and ticket reference
- **Mandatory post-mortem**: All hotfixes must have a follow-up analysis within 24 hours
- **Audit trail**: All hotfix releases are logged and traceable

---

## When to Use Hotfix Override

### Appropriate Use Cases

| Scenario                                      | Use Hotfix? | Notes                                         |
| --------------------------------------------- | ----------- | --------------------------------------------- |
| Critical security vulnerability in production | ✅ Yes      | P0 security issue requiring immediate patch   |
| Production outage affecting customers         | ✅ Yes      | Service down or severely degraded             |
| Data corruption risk                          | ✅ Yes      | Active data loss or integrity threat          |
| Compliance deadline violation                 | ✅ Yes      | Regulatory requirement with imminent deadline |
| Minor bug in non-critical feature             | ❌ No       | Use standard GA pipeline                      |
| Performance improvement                       | ❌ No       | Use standard GA pipeline                      |
| Feature rollout                               | ❌ No       | Use standard GA pipeline                      |

### Approval Criteria

Before initiating a hotfix:

1. **Severity Assessment**: Confirm the issue is P0/P1 severity
2. **Alternative Evaluation**: Confirm no rollback or feature flag can mitigate
3. **Risk Analysis**: Document the risk of deploying vs. not deploying
4. **Stakeholder Notification**: Inform on-call lead and security team

---

## Required Inputs

### Workflow Dispatch Parameters

| Input           | Required | Description                         | Example                                                     |
| --------------- | -------- | ----------------------------------- | ----------------------------------------------------------- |
| `version`       | Yes      | Hotfix version number               | `4.1.2-hotfix.1` or `4.1.3`                                 |
| `commit_sha`    | Yes      | Exact commit to release             | `a8b1963b58452371e7749f714e2b9bea9f482ad`                   |
| `justification` | Yes      | Why hotfix is needed (min 50 chars) | `Critical auth bypass vulnerability affecting all users...` |
| `ticket_url`    | Yes      | Link to incident ticket             | `https://jira.example.com/INCIDENT-123`                     |
| `risk_level`    | Yes      | Risk assessment                     | `low`, `medium`, or `high`                                  |

### Version Naming Convention

Hotfix versions use one of these patterns:

- **Patch increment**: `4.1.3` (if next natural version)
- **Hotfix suffix**: `4.1.2-hotfix.1`, `4.1.2-hotfix.2`

Tags follow the same pattern with `v` prefix: `v4.1.2-hotfix.1`

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Hotfix Release Workflow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ INPUTS: version, commit_sha, justification, ticket_url, risk_level  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│           ┌─────────────────────────────────────────────┐                  │
│           │              verify-hotfix                  │                  │
│           │  - Checkout exact commit_sha                │                  │
│           │  - Run release gates                        │                  │
│           │  - Build evidence bundle                    │                  │
│           │  - Generate provenance + hashes             │                  │
│           │  - Run publish_guard                        │                  │
│           └─────────────────────────────────────────────┘                  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  ⏳ AWAITING APPROVAL - Environment: hotfix-release                   │ │
│  │                                                                       │ │
│  │  Displays: version, commit, justification, ticket, risk level        │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                            [APPROVED]                                       │
│                                      │                                      │
│                                      ▼                                      │
│           ┌─────────────────────────────────────────────┐                  │
│           │              publish-hotfix                 │                  │
│           │  - Create hotfix tag                        │                  │
│           │  - Create GitHub Release                    │                  │
│           │  - Generate hotfix record                   │                  │
│           │  - Create post-mortem placeholder           │                  │
│           └─────────────────────────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Required GitHub Environment

### Environment: `hotfix-release`

#### Configuration Steps

1. **Navigate to Environment Settings**

   ```
   Repository → Settings → Environments → New environment
   ```

2. **Create the Environment**
   - Name: `hotfix-release`
   - Click "Configure environment"

3. **Add Required Reviewers**
   - Enable "Required reviewers"
   - Add **at least 1 reviewer** from the security/on-call team
   - Recommended: Security lead + On-call engineer

4. **Optional: Wait Timer**
   - For high-risk hotfixes, consider a 5-minute wait timer
   - This gives time for last-minute concerns

#### Recommended Reviewers

- `@security-team`
- `@on-call-lead`
- `@platform-engineering`

---

## Artifacts and Guards

### Required Artifacts

Every hotfix produces:

| Artifact                  | Contents                                         | Retention |
| ------------------------- | ------------------------------------------------ | --------- |
| `hotfix-bundle-<version>` | evidence.tar.gz, provenance.json, SHA256SUMS     | 90 days   |
| `hotfix-record-<version>` | hotfix_record.json with justification + approval | 365 days  |

### Guards Enforced

| Guard                | Description                  | Failure Behavior |
| -------------------- | ---------------------------- | ---------------- |
| Release Ready        | `pnpm release:ready`         | Blocks hotfix    |
| Publish Guard        | publish_guard verification   | Blocks hotfix    |
| Provenance           | provenance.json generation   | Blocks hotfix    |
| Bundle Integrity     | SHA256 verification          | Blocks publish   |
| Environment Approval | `hotfix-release` environment | Blocks publish   |

---

## Post-Mortem Requirement

### Mandatory Documentation

Every hotfix **must** have a corresponding post-mortem document:

```
docs/releases/HOTFIX_POSTMORTEMS/<tag>.md
```

Example: `docs/releases/HOTFIX_POSTMORTEMS/v4.1.2-hotfix.1.md`

### Timeline

- **Within 24 hours** of hotfix release (or next business day if weekend/holiday)
- Enforced by `hotfix-postmortem-enforcer.yml` workflow

### Post-Mortem Template

```markdown
# Hotfix Post-Mortem: v4.1.2-hotfix.1

**Date:** 2026-01-08
**Author:** @engineer
**Reviewed By:** @team-lead

## Incident Summary

Brief description of what happened and why a hotfix was needed.

## Timeline

| Time (UTC) | Event                      |
| ---------- | -------------------------- |
| 10:00      | Issue discovered           |
| 10:15      | Hotfix development started |
| 10:45      | Hotfix deployed            |
| 11:00      | Issue confirmed resolved   |

## Root Cause

Technical explanation of the underlying issue.

## Fix Description

What the hotfix changed and why it resolves the issue.

## Verification

How the fix was tested and verified.

## Preventive Measures

What changes will prevent similar issues:

- [ ] Add test coverage for edge case
- [ ] Update monitoring/alerting
- [ ] Update documentation

## Related

- Incident Ticket: [INCIDENT-123](https://jira.example.com/INCIDENT-123)
- Hotfix PR: #456
- Workflow Run: [#789](https://github.com/org/repo/actions/runs/789)
```

---

## Post-Mortem Enforcement

### Automatic Enforcement

The `hotfix-postmortem-enforcer.yml` workflow:

- **Runs daily** (and on-demand via workflow_dispatch)
- **Scans** for hotfix tags without post-mortem files
- **Reports** missing post-mortems
- **Creates an issue** (if permissions allow) for each missing post-mortem

### Manual Check

```bash
# List hotfix tags without post-mortems
for tag in $(git tag -l '*-hotfix.*'); do
  file="docs/releases/HOTFIX_POSTMORTEMS/${tag}.md"
  if [ ! -f "$file" ]; then
    echo "Missing: $file"
  fi
done
```

---

## Operational Procedures

### Initiating a Hotfix

1. **Prepare the Fix**

   ```bash
   # Ensure fix is on main or appropriate branch
   git log -1 <commit-sha>
   ```

2. **Trigger Hotfix Workflow**
   - Navigate to Actions → Hotfix Release
   - Click "Run workflow"
   - Fill in required inputs

3. **Monitor Verification**
   - Watch `verify-hotfix` job
   - Ensure all gates pass

4. **Approve Deployment**
   - Click "Review pending deployments"
   - Verify justification and ticket
   - Click "Approve and deploy"

5. **Verify Release**
   - Check GitHub Releases page
   - Verify artifacts attached
   - Confirm production deployment (if applicable)

6. **Complete Post-Mortem**
   - Create `docs/releases/HOTFIX_POSTMORTEMS/<tag>.md`
   - Fill in template
   - Get review from team lead
   - Commit and push

### Manual Fallback

If the workflow cannot create tags/releases:

```bash
# 1. Verify the commit
git checkout <commit-sha>
git log -1

# 2. Create the tag
git tag -a v4.1.2-hotfix.1 -m "Hotfix: <brief description>

Justification: <justification>
Ticket: <ticket-url>
Commit: <commit-sha>
Risk Level: <low|medium|high>"

# 3. Push the tag
git push origin v4.1.2-hotfix.1

# 4. Create GitHub Release manually
gh release create v4.1.2-hotfix.1 \
  --title "v4.1.2-hotfix.1" \
  --notes "Emergency hotfix release. See post-mortem for details." \
  evidence.tar.gz
```

---

## CODEOWNERS Recommendations

Add to `.github/CODEOWNERS`:

```
# Hotfix and Release Governance
.github/workflows/hotfix-release.yml  @platform-engineering @security-team
.github/workflows/hotfix-postmortem-enforcer.yml  @platform-engineering
scripts/release/*  @platform-engineering
docs/releases/*  @platform-engineering @docs-team
docs/releases/HOTFIX_POSTMORTEMS/*  @platform-engineering
```

---

## Troubleshooting

### Verification Failed

**Symptom:** `verify-hotfix` job fails

**Diagnosis:**

- Check which gate failed (release:ready, publish_guard, etc.)
- Review the commit for issues

**Resolution:**

- Fix the issue in a new commit
- Restart with the new commit SHA

### Approval Not Appearing

**Symptom:** Workflow waiting but no approval prompt

**Diagnosis:**

- Verify `hotfix-release` environment exists
- Check required reviewers are configured

**Resolution:**

- Configure environment in GitHub UI
- Re-run the workflow

### Post-Mortem Enforcer Failing

**Symptom:** Daily enforcer reports missing post-mortems

**Diagnosis:**

- List hotfix tags without corresponding files
- Check file naming matches tag exactly

**Resolution:**

- Create missing post-mortem files
- Use exact tag name for filename

---

## References

- [Two-Person Approval](TWO_PERSON_APPROVAL.md)
- [SBOM Unification](SBOM_UNIFICATION.md)
- [Bundle SBOM Specification](BUNDLE_SBOM.md)
- [Required Checks Policy](../ci/REQUIRED_CHECKS_POLICY.json)

---

## Change Log

| Date       | Change                  | Author               |
| ---------- | ----------------------- | -------------------- |
| 2026-01-08 | Initial Hotfix Override | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
