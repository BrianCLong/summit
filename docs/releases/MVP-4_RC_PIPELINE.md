# MVP-4 RC Tag Pipeline

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The RC Tag Pipeline automatically runs when a Release Candidate tag is pushed to the repository. It verifies the tagged commit, runs the Promotion Guard, and produces a Promotion Bundle artifact for safe RC → GA promotion.

**Trigger**: Push of tag matching `v*.*.*-rc.*` (e.g., `v4.1.2-rc.1`)

## What Happens When You Tag an RC

### 1. Workflow Triggered

When you push a tag like `v4.1.2-rc.1`, the `.github/workflows/release-rc.yml` workflow automatically starts.

### 2. Verification Jobs

The pipeline runs three jobs:

| Job                 | Purpose                                           | Duration   |
| ------------------- | ------------------------------------------------- | ---------- |
| **verify**          | Runs `pnpm release:ready` on tagged commit        | ~15-20 min |
| **promotion-guard** | Runs `verify-green-for-tag.sh` to check all gates | ~2 min     |
| **bundle**          | Builds Promotion Bundle artifact                  | ~1 min     |

### 3. Promotion Bundle Created

The workflow uploads a `promotion-bundle-<tag>` artifact containing:

```
artifacts/promotion-bundles/v4.1.2-rc.1/
├── github_release.md          # Release notes for GitHub Release
├── promote_to_ga.sh           # Operator script to promote to GA
├── REQUIRED_CHECKS.txt        # Truth table snapshot from verification
├── PROMOTION_CHECKLIST.md     # Step-by-step promotion guide
└── WORKFLOW_METADATA.txt      # CI run metadata
```

## Finding the Promotion Bundle

### Via GitHub UI

1. Go to **Actions** → **RC Tag Pipeline**
2. Click on the workflow run for your RC tag
3. Scroll to **Artifacts** section
4. Download `promotion-bundle-<tag>`

### Via GitHub CLI

```bash
# List artifacts for a specific workflow run
gh run view <run-id> --repo <owner>/<repo>

# Download the promotion bundle
gh run download <run-id> --name promotion-bundle-v4.1.2-rc.1
```

## How to Promote RC to GA

### Option A: Use the Promotion Script (Recommended)

1. **Download and extract the bundle**:

   ```bash
   gh run download <run-id> --name promotion-bundle-v4.1.2-rc.1
   cd promotion-bundle-v4.1.2-rc.1
   ```

2. **Review the checklist**:

   ```bash
   cat PROMOTION_CHECKLIST.md
   ```

3. **Dry run first**:

   ```bash
   ./promote_to_ga.sh --dry-run
   ```

4. **Execute promotion**:
   ```bash
   ./promote_to_ga.sh
   ```

### Option B: Manual Promotion

1. **Re-verify the RC**:

   ```bash
   ./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --commit <sha>
   ```

2. **Create GA tag**:

   ```bash
   git tag -a v4.1.2 <sha> -m "MVP-4 Stabilization Release v4.1.2"
   ```

3. **Push GA tag**:

   ```bash
   git push origin v4.1.2
   ```

4. **Create GitHub Release**:
   ```bash
   gh release create v4.1.2 \
     --title "v4.1.2 - MVP-4 Stabilization" \
     --notes-file docs/releases/MVP-4_STABILIZATION_RELEASE_NOTES.md
   ```

## Interpreting Promotion Guard Results

### All Checks Passed ✅

```
[SUCCESS] PROMOTION ALLOWED: All required checks passed ✅
```

The RC is safe to promote to GA.

### Checks Pending ⏳

```
[ERROR] PROMOTION BLOCKED: One or more required checks failed ❌

Blocking failures:
  • Release Readiness Gate: QUEUED (not completed)
  • Unit Tests & Coverage: IN_PROGRESS (not completed)
```

Wait for the pending checks to complete, then re-verify:

```bash
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --commit <sha>
```

### Checks Failed ❌

```
[ERROR] PROMOTION BLOCKED: One or more required checks failed ❌

Blocking failures:
  • GA Gate: FAILURE
```

The RC has failing checks and cannot be promoted. Fix the issues and create a new RC:

1. Push fixes to main
2. Tag a new RC: `v4.1.2-rc.2`
3. Wait for the RC Pipeline to complete
4. Promote from the new RC

## Creating an RC Tag

### Standard Process

```bash
# Ensure you're on main with latest changes
git checkout main
git pull origin main

# Create RC tag
git tag -a v4.1.2-rc.1 -m "MVP-4 Stabilization RC 1"

# Push the tag (triggers RC Pipeline)
git push origin v4.1.2-rc.1
```

### Using the Preparation Script

```bash
# Dry run to preview
./scripts/release/prepare-stabilization-rc.sh --dry-run

# Execute
./scripts/release/prepare-stabilization-rc.sh --live
```

## Rollback Instructions

### Delete RC Tag

If an RC needs to be withdrawn:

```bash
# Delete locally
git tag -d v4.1.2-rc.1

# Delete remotely
git push origin :refs/tags/v4.1.2-rc.1
```

### Delete GA Tag (Emergency)

If a GA tag was created prematurely:

```bash
# Delete locally
git tag -d v4.1.2

# Delete remotely
git push origin :refs/tags/v4.1.2

# Delete GitHub Release if created
gh release delete v4.1.2 --yes
```

## Troubleshooting

### RC Pipeline Not Triggered

**Symptom**: Tagged RC but no workflow run started

**Diagnosis**:

1. Verify tag format matches `v*.*.*-rc.*`
2. Check if workflow is enabled: Settings → Actions → Workflows

**Resolution**:

```bash
# Verify tag exists remotely
git ls-remote --tags origin | grep v4.1.2-rc.1

# If missing, re-push
git push origin v4.1.2-rc.1
```

### Bundle Artifact Missing

**Symptom**: Workflow completed but no artifact

**Diagnosis**:

1. Check if the `verify` job succeeded
2. Check workflow logs for errors

**Resolution**:

- If `verify` failed, fix issues and create new RC
- If artifact upload failed, check Actions storage limits

### Promotion Script Fails

**Symptom**: `promote_to_ga.sh` exits with error

**Diagnosis**:

```bash
# Run with dry-run to see what it would do
./promote_to_ga.sh --dry-run
```

**Common issues**:

- Git not configured with push access
- gh CLI not authenticated
- Required checks still pending

## Related Documentation

- [Required Checks](../ci/REQUIRED_CHECKS.md) - Policy for required CI checks
- [Promotion Guide](MVP-4_STABILIZATION_PROMOTION.md) - Full promotion procedure
- [Tagging Guide](MVP-4_STABILIZATION_TAGGING.md) - RC and GA tagging conventions

## Change Log

| Date       | Change                        | Author               |
| ---------- | ----------------------------- | -------------------- |
| 2026-01-08 | Initial RC Pipeline for MVP-4 | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
