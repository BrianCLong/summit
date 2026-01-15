# Two-Person Release Approval

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

Two-Person Release Approval ensures that GA releases require explicit approval from a second human before publishing. This provides an additional safety gate beyond automated CI checks, ensuring that production releases are reviewed by at least two people.

### Key Benefits

- **Human oversight**: Critical releases require manual review before publication
- **Audit trail**: All approvals are logged in GitHub's audit log
- **Determinism**: The approved artifact/commit SHA is exactly what gets published
- **Non-blocking CI**: Builds and verification run automatically; only publishing waits for approval

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GA Release Workflow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ test-and-verify │ → │  build-server   │ → │  build-client   │           │
│  │   (automatic)   │   │   (automatic)   │   │   (automatic)   │           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                                      │                      │
│                                                      ▼                      │
│                               ┌─────────────────────────────────┐          │
│                               │         collect-sboms           │          │
│                               │          (automatic)            │          │
│                               └─────────────────────────────────┘          │
│                                                      │                      │
│                                                      ▼                      │
│                               ┌─────────────────────────────────┐          │
│                               │       prepare-release           │          │
│                               │  (automatic, creates bundle)    │          │
│                               └─────────────────────────────────┘          │
│                                                      │                      │
│                                                      ▼                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  ⏳ AWAITING APPROVAL - Environment: ga-release                       │ │
│  │                                                                       │ │
│  │  Required reviewers must approve before continuing                    │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                      │                      │
│                                            [APPROVED]                       │
│                                                      │                      │
│                                                      ▼                      │
│                               ┌─────────────────────────────────┐          │
│                               │          publish                │          │
│                               │  (runs after approval)          │          │
│                               │  - Verify bundle integrity      │          │
│                               │  - Generate approval record     │          │
│                               │  - Publish GitHub Release       │          │
│                               └─────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Required GitHub Environment Configuration

### Environment: `ga-release`

This environment gates the publish job for GA releases.

#### GitHub UI Configuration Steps

1. **Navigate to Environment Settings**

   ```
   Repository → Settings → Environments → New environment
   ```

2. **Create the Environment**
   - Name: `ga-release`
   - Click "Configure environment"

3. **Add Required Reviewers**
   - Enable "Required reviewers"
   - Add at least **1 additional reviewer** (not the person who triggered the workflow)
   - Recommended: Add 2-3 reviewers from your release team
   - Click "Save protection rules"

4. **Optional: Restrict to Protected Branches**
   - Enable "Deployment branches and tags"
   - Select "Protected branches only" or specify tag patterns like `v*`

5. **Optional: Add Wait Timer**
   - Enable "Wait timer" if you want a minimum delay (e.g., 5 minutes)
   - This can help catch last-minute issues

#### Required Reviewers Recommendation

Add team members who:

- Have deep knowledge of the release process
- Are available during release windows
- Understand production impact of releases

Example reviewer list:

- `@release-team`
- `@platform-lead`
- `@on-call-engineer`

---

## Workflow Details

### Jobs Affected

| Job               | Behavior                   | Environment Gate |
| ----------------- | -------------------------- | ---------------- |
| `test-and-verify` | Runs automatically         | None             |
| `build-server`    | Runs automatically         | None             |
| `build-client`    | Runs automatically         | None             |
| `collect-sboms`   | Runs automatically         | None             |
| `prepare-release` | Runs automatically         | None             |
| **`publish`**     | **Blocked until approved** | `ga-release`     |

### What Gets Blocked

The `publish` job is the **only job** that requires approval. It:

- Downloads the prepared release bundle
- Verifies bundle integrity (SHA256 hash check)
- Generates approval record (`approval_record.json`)
- Creates or updates the GitHub Release
- Uploads evidence artifacts

### Determinism Guarantee

The release is bound to the exact commit SHA and artifacts from earlier in the run:

1. **prepare-release** calculates `evidence_sha256` from the built artifacts
2. This hash is passed as a job output to **publish**
3. **publish** re-calculates the hash and compares
4. If hashes don't match, the publish is blocked

This ensures the approved artifact is identical to what was verified by automated tests.

---

## Approval Record

Every approved release generates an `approval_record.json` artifact:

```json
{
  "version": "1.0.0",
  "approval": {
    "workflow_run_id": "12345678",
    "workflow_run_url": "https://github.com/org/repo/actions/runs/12345678",
    "environment": "ga-release",
    "tag": "v4.1.2",
    "commit_sha": "a8b1963...",
    "evidence_sha256": "abc123...",
    "provenance_sha256": "def456...",
    "approved_at": "2026-01-08T12:00:00Z",
    "triggered_by": "user",
    "repository": "org/repo"
  },
  "verification": {
    "bundle_integrity": "verified",
    "required_checks": "passed",
    "environment_approval": "granted"
  },
  "audit_note": "Reviewer identity available in GitHub audit log for this workflow run"
}
```

### Finding Reviewer Identity

The approval record does not contain the reviewer's identity directly (GitHub doesn't expose this in standard environment variables). To find who approved:

1. **GitHub Audit Log**:

   ```
   Repository → Settings → Audit log → Filter by: action:environment.approve
   ```

2. **Workflow Run UI**:
   - Open the workflow run URL
   - Look at the "Waiting for review" section (shows who approved)

---

## Operational Flow

### Standard Release Flow

1. **Tag Creation**: Push a new tag (e.g., `v4.1.2`)
2. **Automatic Verification**: CI runs tests, builds images, collects SBOMs
3. **Bundle Preparation**: `prepare-release` creates the evidence bundle
4. **Approval Request**: Workflow pauses, reviewers notified
5. **Review**: Reviewer examines:
   - Build logs
   - Test results
   - Evidence artifacts
   - Commit contents
6. **Approval**: Reviewer clicks "Approve and deploy"
7. **Publish**: `publish` job runs, creates GitHub Release

### Approving a Release

When a release is waiting for approval:

1. **Navigate to the Workflow Run**
   - Open the GitHub Actions tab
   - Find the waiting "GA Release" workflow

2. **Review the Pending Deployment**
   - Click "Review pending deployments"
   - Select the `ga-release` environment

3. **Examine the Release**
   - Review the job summary
   - Check the `prepare-release` outputs
   - Download and inspect evidence artifacts if needed

4. **Approve or Reject**
   - Click "Approve and deploy" to proceed
   - Click "Reject" to abort the release

### Rejection

If you reject a release:

- The `publish` job will not run
- The workflow run will be marked as failed
- A new workflow run will be needed to retry

---

## Dry Run Mode

For testing the release process without publishing:

1. Trigger the workflow with `dry_run: true`
2. All jobs run including `publish` (after approval)
3. No GitHub Release is created
4. All evidence and approval records are still generated

This allows testing the two-person approval flow without creating real releases.

---

## Emergency Override

For critical hotfixes that cannot wait for approval, consider:

1. **Emergency Hotfix Environment**: Create a separate `ga-release-emergency` environment with:
   - Fewer required reviewers
   - Mandatory post-mortem documentation
   - Stricter audit logging

2. **Documentation Requirement**: Emergency releases should:
   - Create an incident ticket
   - Update `docs/releases/EMERGENCY_RELEASES.md` with details
   - Schedule a post-mortem review

**Note:** Emergency override is not currently implemented. Contact Platform Engineering to discuss requirements.

---

## Troubleshooting

### Approval Request Not Appearing

**Symptom:** Workflow is stuck but no approval request visible

**Diagnosis:**

- Verify the `ga-release` environment exists
- Check that required reviewers are configured
- Ensure you have permission to view pending deployments

**Resolution:**

- Re-run the workflow after fixing environment configuration
- Check GitHub's service status for Actions issues

### Wrong Artifact Published

**Symptom:** Published release doesn't match expected content

**Diagnosis:**

- Check `approval_record.json` for the verified hashes
- Compare against the downloaded release

**Resolution:**

- The integrity check should prevent this
- If it occurs, the publish job would have failed with hash mismatch
- Delete the release and re-run the workflow

### Reviewer Not Available

**Symptom:** Release waiting for approval but no reviewers online

**Diagnosis:**

- Check reviewer availability
- Verify backup reviewers are configured

**Resolution:**

- Add additional reviewers to the environment
- Consider time-zone distribution for global teams

---

## Audit and Compliance

### Artifacts Retained

| Artifact                | Retention | Purpose                    |
| ----------------------- | --------- | -------------------------- |
| `release-bundle-<tag>`  | 90 days   | Evidence bundle tarball    |
| `approval-record-<tag>` | 365 days  | Approval audit trail       |
| `sbom-bundle-<tag>`     | 90 days   | Software bill of materials |

### Compliance Requirements

Two-person approval helps satisfy:

- **SOC 2**: Change management controls
- **ISO 27001**: Separation of duties
- **SLSA Level 3**: Verified provenance with human review

---

## References

- [SBOM Unification](SBOM_UNIFICATION.md)
- [Bundle SBOM Specification](BUNDLE_SBOM.md)
- [Required Checks Policy](../ci/REQUIRED_CHECKS_POLICY.json)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Two-Person Approval | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
