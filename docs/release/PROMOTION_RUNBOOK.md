# RC → GA Promotion Runbook

**Version:** 1.0.0
**Last Updated:** 2026-01-09

This runbook provides step-by-step instructions for promoting a Release Candidate (RC) to General Availability (GA).

---

## Prerequisites

Before starting promotion, ensure:

1. **RC Release Exists:** The RC tag (e.g., `v4.1.2-rc.1`) has been created and published
2. **GA Gate Passed:** All required checks passed for the RC commit
3. **No Change Freeze:** Change freeze is not active (or override approved)
4. **Authorization:** You are a member of `@release-captains`

---

## Step 1: Verify RC Readiness

### Check RC Release Status

```bash
# View RC release
gh release view v4.1.2-rc.1

# Check required assets are present
gh release view v4.1.2-rc.1 --json assets -q '.assets[].name'
```

Expected assets:
- `evidence.tar.gz` or `evidence-bundle.tar.gz`
- `SHA256SUMS` or `MANIFEST.sha256`
- `sbom-cyclonedx.json`
- `trust-snapshot.json` (if applicable)
- `*.intoto.jsonl` (SLSA provenance)

### Verify GA Gate Status

```bash
# Check workflow runs for the RC commit
gh run list --commit $(git rev-parse v4.1.2-rc.1^{})

# Verify GA gate passed
gh run view <run-id> --json conclusion
```

---

## Step 2: Initiate Promotion

### Option A: Via GitHub UI (Recommended)

1. Navigate to **Actions** → **Release Promote RC → GA**
2. Click **Run workflow**
3. Fill in parameters:
   - `rc_tag`: e.g., `v4.1.2-rc.1`
   - `publish`: `true` (or `false` for draft)
   - `notes_mode`: `carry_over` (recommended)
   - `dry_run`: `false`
4. Click **Run workflow**
5. Wait for environment approval (2 reviewers required)

### Option B: Via CLI

```bash
gh workflow run release-promote-ga.yml \
  -f rc_tag=v4.1.2-rc.1 \
  -f publish=true \
  -f notes_mode=carry_over \
  -f dry_run=false
```

---

## Step 3: Environment Approval

The `create-release` job requires approval from the `ga-release` environment.

1. Two designated reviewers must approve
2. Approval can be done via:
   - GitHub Actions UI: Click **Review deployments**
   - Email notification link

### Who Can Approve

- Members of the `ga-release-reviewers` team
- Not the person who initiated the workflow

---

## Step 4: Monitor Promotion

### Watch Workflow Progress

```bash
# Get latest run ID
RUN_ID=$(gh run list --workflow=release-promote-ga.yml --limit=1 --json databaseId -q '.[0].databaseId')

# Watch progress
gh run watch $RUN_ID
```

### Check for Issues

If the workflow fails, check:

1. **Resolve Stage:** Tag format or precondition issues
2. **Download Stage:** Asset download or verification failures
3. **Release Stage:** Tag creation or release publishing issues

---

## Step 5: Verify Promotion

After the workflow completes:

### Check GA Release

```bash
# View GA release
gh release view v4.1.2

# Verify assets
gh release view v4.1.2 --json assets -q '.assets[].name'
```

### Verify Post-Release Attestation

The `release-post-verify.yml` workflow runs automatically on release publish.

```bash
# Check post-verify workflow
gh run list --workflow=release-post-verify.yml --limit=1

# Download attestation
gh release download v4.1.2 --pattern "ga-attestation.json"
cat ga-attestation.json | jq .attestation_status
```

Expected: `"PASS"`

### Local Verification

```bash
# Run local verifier
npx tsx scripts/release/verify_release_assets.ts --tag v4.1.2
```

---

## Troubleshooting

### Issue: "RC tag does not exist"

**Cause:** The specified RC tag was not found.

**Resolution:**
```bash
# List available RC tags
git tag -l "v*-rc.*"

# Verify the exact tag name
gh release list | grep -i rc
```

### Issue: "RC commit is not on main branch"

**Cause:** The RC was created from a non-main branch.

**Resolution:**
1. Verify the RC was correctly cherry-picked to main
2. If needed, create a new RC from main

### Issue: "GA tag already exists but points to different SHA"

**Cause:** Conflicting GA tag from a previous attempt.

**Resolution:**
1. **Do not delete the existing tag** (audit trail)
2. Investigate why SHAs differ
3. If prior GA was incorrect, create a patch release (v4.1.3)

### Issue: "Evidence manifest verification failed"

**Cause:** Evidence bundle was corrupted or modified.

**Resolution:**
1. Re-download from RC release
2. Verify checksums manually
3. If corrupted at source, investigate RC workflow

### Issue: "Environment approval timeout"

**Cause:** Reviewers did not approve within time limit.

**Resolution:**
1. Contact designated reviewers
2. Re-run the workflow after approval is ready

---

## Rollback Procedures

### If GA Was Published with Issues

1. **Mark as pre-release:**
   ```bash
   gh release edit v4.1.2 --prerelease
   ```

2. **Add warning to release notes:**
   ```bash
   gh release edit v4.1.2 --notes "⚠️ WITHDRAWN - See v4.1.3 for fix"
   ```

3. **Create hotfix release:**
   - Follow hotfix lane process for v4.1.3

### If GA Was Not Yet Published (Draft)

1. **Delete draft release:**
   ```bash
   gh release delete v4.1.2 --yes
   ```

2. **Delete GA tag (if created):**
   ```bash
   git push origin :refs/tags/v4.1.2
   ```

3. **Investigate and retry**

---

## Artifacts Reference

### Promotion Artifacts

| Artifact | Description |
|----------|-------------|
| `digests.json` | SHA256 hashes of all promoted assets |
| `summary.md` | Human-readable promotion summary |
| `ga-attestation.json` | Post-verification attestation |

### Asset Verification

```bash
# Download and verify locally
gh release download v4.1.2 --dir ./release-assets

# Check digests
cd release-assets
sha256sum -c SHA256SUMS
```

---

## Checklist

- [ ] RC release exists with all required assets
- [ ] GA gate passed for RC commit
- [ ] Change freeze not active
- [ ] Promotion workflow initiated
- [ ] Environment approval obtained (2 reviewers)
- [ ] GA tag created
- [ ] GA release published with identical assets
- [ ] Post-verification passed (attestation_status: PASS)
- [ ] ga-attestation.json attached to release

---

## Related Documentation

- [Promotion Policy](./PROMOTION_POLICY.md)
- [GA Pipeline](../ci/RELEASE_GA_PIPELINE.md)
- [Change Freeze Policy](../ci/CHANGE_FREEZE_MODE.md)
- [Hotfix Lane](./HOTFIX_LANE.md)
