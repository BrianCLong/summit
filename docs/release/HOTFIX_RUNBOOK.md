# Hotfix Lane Runbook

**Version:** 1.0.0
**Last Updated:** 2026-01-09

This runbook provides step-by-step instructions for releasing emergency hotfixes.

---

## Prerequisites

Before starting a hotfix release:

1. **Parent GA Release Exists:** The base release (e.g., `v4.1.2`) must exist
2. **Hotfix Commit Ready:** The fix is committed and pushed
3. **Ticket Created:** Incident ticket is filed and linked
4. **Approvers Available:** Two reviewers can approve the release

---

## Quick Reference

### Hotfix Types

| Type | Version Format | Example |
|------|---------------|---------|
| Patch increment | `vX.Y.Z+1` | `v4.1.3` (from `v4.1.2`) |
| Hotfix suffix | `vX.Y.Z-hotfix.N` | `v4.1.2-hotfix.1` |

### Decision Tree

```
Is this a security vulnerability?
├── Yes → Use hotfix lane (this runbook)
└── No → Is production down?
    ├── Yes → Use hotfix lane (this runbook)
    └── No → Is this P0/P1 severity?
        ├── Yes → Use hotfix lane (this runbook)
        └── No → Use normal release process
```

---

## Step 1: Prepare the Hotfix

### Create Hotfix Branch

```bash
# Identify parent release
PARENT_TAG="v4.1.2"

# Checkout parent and create hotfix branch
git fetch origin
git checkout ${PARENT_TAG}
git checkout -b hotfix/v4.1.3
```

### Apply the Fix

```bash
# Cherry-pick fix commits OR apply minimal changes directly
git cherry-pick <fix-commit-sha>

# Or create new commits directly on the branch
# IMPORTANT: Only fix the specific issue - no other changes
```

### Verify the Fix Locally

```bash
# Run relevant tests
pnpm test --filter=affected

# Build to verify no breaks
pnpm build

# Run local verification
pnpm hotfix:verify --parent ${PARENT_TAG}
```

### Push the Branch

```bash
git push origin hotfix/v4.1.3
```

---

## Step 2: Request Waivers (If Needed)

If any release gates cannot pass due to the emergency nature:

### Create Waiver Request

Edit `docs/releases/_state/hotfix_waivers.json`:

```json
{
  "version": "1.0.0",
  "waivers": [
    {
      "id": "HW-2026-001",
      "type": "gate-bypass",
      "hotfix_tag": "v4.1.3",
      "gates_waived": ["integration-tests"],
      "justification": "Emergency CVE patch - integration tests not affected by security fix",
      "risk_assessment": "low",
      "mitigations": [
        "Manual verification of affected endpoints",
        "Canary deployment at 5% traffic"
      ],
      "created_at": "2026-01-09T10:00:00Z",
      "expires_at": "2026-01-16T10:00:00Z",
      "approved_by": [],
      "ticket_url": "https://issues.example.com/SEC-1234",
      "status": "pending"
    }
  ]
}
```

### Get Approvals

1. Create a PR with the waiver addition
2. Get 2 approvers to comment `LGTM` and add their handles to `approved_by`
3. Update status to `active`
4. Merge the waiver PR

### Waiver Expiry Limits

| Waiver Type | Maximum Duration |
|-------------|------------------|
| gate-bypass | 7 days |
| coverage-exception | 7 days |
| security-exception | 72 hours |
| compliance-exception | 7 days |

---

## Step 3: Trigger the Hotfix Release

### Via GitHub UI (Recommended)

1. Navigate to **Actions** → **Hotfix Release**
2. Click **Run workflow**
3. Fill in parameters:
   - `version`: e.g., `4.1.3`
   - `commit_sha`: Full 40-character SHA of hotfix commit
   - `parent_tag`: e.g., `v4.1.2`
   - `justification`: Minimum 50 characters explaining the need
   - `ticket_url`: Link to incident ticket
   - `risk_level`: `low`, `medium`, or `high`
   - `waiver_ids`: (optional) e.g., `HW-2026-001,HW-2026-002`
4. Click **Run workflow**

### Via CLI

```bash
# Get the commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

gh workflow run hotfix-release.yml \
  -f version=4.1.3 \
  -f commit_sha=${COMMIT_SHA} \
  -f parent_tag=v4.1.2 \
  -f justification="Critical CVE-2026-XXXX remediation affecting authentication module" \
  -f ticket_url=https://issues.example.com/SEC-1234 \
  -f risk_level=high \
  -f waiver_ids=HW-2026-001
```

---

## Step 4: Environment Approval

The `publish-hotfix` job requires approval from the `hotfix-release` environment.

### Approval Process

1. Two reviewers must approve in GitHub Actions
2. Navigate to the workflow run
3. Click **Review deployments**
4. Select `hotfix-release` environment
5. Add review comment and approve

### Reviewer Checklist

Before approving, verify:

- [ ] Justification is clear and valid
- [ ] Ticket is linked and describes the issue
- [ ] Risk level is appropriate
- [ ] Waivers (if any) are valid and not expired
- [ ] Commit only contains the fix (no unrelated changes)
- [ ] Parent release is correct

---

## Step 5: Monitor Release

### Watch Workflow

```bash
# Get run ID
RUN_ID=$(gh run list --workflow=hotfix-release.yml --limit=1 --json databaseId -q '.[0].databaseId')

# Watch progress
gh run watch ${RUN_ID}
```

### Verify Release

```bash
# View release
gh release view v4.1.3

# Verify evidence
./scripts/release/verify_hotfix_evidence.sh --tag v4.1.3 --parent v4.1.2
```

---

## Step 6: File Post-Mortem

**Required within 24 hours**

### Create Post-Mortem Document

```bash
# Copy template
cp docs/releases/HOTFIX_POSTMORTEMS/_template.md \
   docs/releases/HOTFIX_POSTMORTEMS/v4.1.3.md

# Edit with your incident details
```

### Required Sections

1. **Executive Summary** - 2-3 sentence overview
2. **Timeline** - Chronological event log
3. **Root Cause Analysis** - What happened and why
4. **Resolution** - What the fix changed
5. **Prevention Measures** - How to prevent recurrence

### Submit Post-Mortem

```bash
git add docs/releases/HOTFIX_POSTMORTEMS/v4.1.3.md
git commit -m "docs: add post-mortem for v4.1.3 hotfix"
git push origin main
```

---

## Troubleshooting

### Issue: "Parent release not found"

**Cause:** Parent tag doesn't exist or isn't accessible.

**Resolution:**
```bash
# List available tags
git tag -l "v4.1.*"

# Fetch all tags
git fetch --tags

# Verify parent release exists
gh release view v4.1.2
```

### Issue: "Hotfix commit does not descend from parent"

**Cause:** The hotfix branch wasn't created from the parent tag.

**Resolution:**
```bash
# Verify commit ancestry
git merge-base --is-ancestor v4.1.2 <hotfix-commit>

# If false, rebase or recreate the hotfix branch
git checkout v4.1.2
git checkout -b hotfix/v4.1.3-new
git cherry-pick <fix-commits>
```

### Issue: "Waiver expired"

**Cause:** Waiver's `expires_at` timestamp has passed.

**Resolution:**
1. **Do not extend expired waivers** - create a new one
2. File new waiver with fresh expiry
3. Get new approvals
4. Re-run the workflow with new waiver ID

### Issue: "Waiver requires 2 approvers"

**Cause:** Waiver doesn't have enough approvers.

**Resolution:**
1. Update the waiver JSON with both approver handles
2. Get approvers to explicitly approve in PR/issue
3. Commit updated waiver file

### Issue: "Gates failed even with waiver"

**Cause:** Waiver may not cover all failing gates, or waiver is for wrong tag.

**Resolution:**
1. Check `gates_waived` array in waiver
2. Verify `hotfix_tag` matches the version you're releasing
3. Add missing gates to waiver if needed

---

## Rollback Procedure

If the hotfix causes issues:

### Mark as Pre-Release

```bash
gh release edit v4.1.3 --prerelease
```

### Add Warning Note

```bash
gh release edit v4.1.3 --notes "$(gh release view v4.1.3 --json body -q .body)

---

**WARNING: This release has been rolled back. See v4.1.4 for fix.**"
```

### File Rollback Post-Mortem

Create `docs/releases/HOTFIX_POSTMORTEMS/v4.1.3-rollback.md` documenting:
- Why the hotfix was rolled back
- Impact of the rolled-back release
- Plan for corrected fix

---

## Verification Scripts

### Validate Waivers

```bash
# Check all waivers are valid
./scripts/release/verify_hotfix_waivers.sh

# Strict mode (fail on warnings)
./scripts/release/verify_hotfix_waivers.sh --strict

# JSON output
./scripts/release/verify_hotfix_waivers.sh --json
```

### Validate Evidence

```bash
# Verify hotfix evidence bundle
./scripts/release/verify_hotfix_evidence.sh --tag v4.1.3

# Verify with parent validation
./scripts/release/verify_hotfix_evidence.sh --tag v4.1.3 --parent v4.1.2

# JSON output
./scripts/release/verify_hotfix_evidence.sh --tag v4.1.3 --json
```

---

## Related Documentation

- [Hotfix Lane Policy](./HOTFIX_LANE.md)
- [Promotion Policy](./PROMOTION_POLICY.md)
- [Post-Mortem Template](./HOTFIX_POSTMORTEMS/_template.md)
- [Waiver Audit Log](../releases/_state/waiver_audit_log.json)

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Release Captain | @release-captains |
| Security | @security-team |
| SRE On-Call | @sre-oncall |
