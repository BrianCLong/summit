# Release RC Pipeline

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release RC Pipeline is the canonical workflow that handles all RC (Release Candidate) tag events. It consolidates verification and promotion bundle generation into a single authoritative pipeline, eliminating race conditions and duplicate artifacts.

### Key Properties

- **Single source of truth**: One workflow handles all RC tag events
- **Unified artifact**: Produces `rc-pipeline-bundle-{tag}` with all materials
- **Three-stage pipeline**: Verify → Promotion Guard → Assemble Bundle
- **Machine-readable metadata**: Includes `pipeline_metadata.json` for automation

---

## When This Runs

The pipeline automatically triggers on:

1. **RC tag push**: When a `v*.*.*-rc.*` tag is pushed
2. **Manual dispatch**: Re-run without re-pushing tag

---

## Pipeline Stages

### Stage 1: Release Readiness

Runs the canonical `release:ready` gate to verify:

- TypeScript compilation passes
- Server builds successfully
- Core tests pass

### Stage 2: Promotion Guard

Verifies all required CI checks using the policy-driven truth table approach:

- **Policy-driven**: Loads check requirements from `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Deterministic base**: Computes base reference using `compute_base_for_commit.sh`
- Always-required checks (CI Core, Unit Tests, GA Gate)
- Conditionally-required checks (based on changed files vs base)
- Generates `REQUIRED_CHECKS.txt` snapshot

The base reference for RC tags is computed as:

1. Previous RC tag with same base version (e.g., v4.1.2-rc.1 for v4.1.2-rc.2)
2. If no prior RC, previous GA tag in release line (e.g., v4.1.1)
3. If no prior GA, merge-base with main branch

### Stage 3: Assemble Pipeline Bundle

Combines all artifacts into single `rc-pipeline-bundle-{tag}`:

- Verification output
- Promotion bundle materials
- Pipeline metadata

---

## Generated Artifact

The pipeline produces a single artifact: `rc-pipeline-bundle-{tag}`

### Bundle Contents

| File                     | Purpose                            |
| ------------------------ | ---------------------------------- |
| `pipeline_metadata.json` | Machine-readable pipeline metadata |
| `REQUIRED_CHECKS.txt`    | Verification truth table output    |
| `github_release.md`      | GitHub Release description         |
| `promote_to_ga.sh`       | Script to promote RC to GA         |
| `PROMOTION_CHECKLIST.md` | Step-by-step promotion guide       |
| `README.md`              | Bundle usage instructions          |

### Example pipeline_metadata.json

```json
{
  "version": "1.0.0",
  "pipeline": "release-rc",
  "generated_at": "2026-01-08T10:00:00Z",
  "rc_tag": "v4.1.2-rc.1",
  "ga_tag": "v4.1.2",
  "base_version": "4.1.2",
  "commit_sha": "a8b1963...",
  "verification_status": "true",
  "promotion_allowed": true,
  "workflow": {
    "run_id": "12345678",
    "run_number": "42",
    "run_url": "https://github.com/org/repo/actions/runs/12345678",
    "actor": "release-bot",
    "event": "push"
  },
  "jobs": {
    "verify": "success",
    "promotion_guard": "success"
  },
  "artifacts": {
    "verification": "REQUIRED_CHECKS.txt",
    "promotion_script": "promote_to_ga.sh",
    "release_notes": "github_release.md",
    "checklist": "PROMOTION_CHECKLIST.md"
  }
}
```

---

## Usage

### Automatic (Recommended)

Push an RC tag to trigger the pipeline:

```bash
# Create and push RC tag
git tag -a v4.1.2-rc.1 -m "MVP-4 Stabilization RC 1"
git push origin v4.1.2-rc.1
```

The workflow will:

1. Verify the tagged commit
2. Run promotion guard checks
3. Generate and upload `rc-pipeline-bundle-v4.1.2-rc.1`

### Manual Dispatch

Re-run the pipeline without pushing a new tag:

1. Navigate to **Actions → Release RC Pipeline**
2. Click **"Run workflow"**
3. Enter the RC tag (e.g., `v4.1.2-rc.1`)
4. Click **"Run workflow"**

---

## How to Promote

After the pipeline completes successfully:

### Download and Extract

```bash
# Download from GitHub Actions artifacts
# Extract the rc-pipeline-bundle-{tag}.zip

cd rc-pipeline-bundle-v4.1.2-rc.1
```

### Review Verification Status

```bash
# Check if all required checks passed
cat REQUIRED_CHECKS.txt

# Review pipeline metadata
cat pipeline_metadata.json | jq .
```

### Execute Promotion

```bash
# Preview GA promotion
./promote_to_ga.sh --dry-run

# Execute promotion
./promote_to_ga.sh
```

---

## Relationship to Other Workflows

### Supersedes

The Release RC Pipeline supersedes the tag push triggers in:

- **Tag Verification** (`tag-verification.yml`) - Now manual-only
- **Promotion Bundle** (`promotion-bundle.yml`) - Now manual-only

### Works With

- **RC Preparation** (`rc-preparation.yml`) - Creates the RC tag that triggers this pipeline
- **GA Promotion** - Uses the bundle from this pipeline

### Pipeline Flow

```
RC Preparation (dispatch)
    ↓
  Creates RC tag
    ↓
Release RC Pipeline (tag push)
    ↓
  Produces rc-pipeline-bundle-{tag}
    ↓
GA Promotion (manual)
    ↓
  Uses bundle to create GA tag
```

---

## Configuration

### Workflow Inputs (Manual Dispatch)

| Input | Description       | Default  |
| ----- | ----------------- | -------- |
| `tag` | RC tag to process | Required |

### Concurrency

The workflow uses concurrency groups to prevent parallel runs:

```yaml
concurrency:
  group: release-rc-${{ github.ref_name || inputs.tag }}
  cancel-in-progress: false
```

---

## Troubleshooting

### Pipeline Fails at Stage 1 (Release Readiness)

```bash
# Run release:ready locally to debug
pnpm release:ready
```

### Promotion Guard Shows Failures

```bash
# Verify locally which checks are failing
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --verbose

# Wait for in-progress workflows
gh run list --commit <sha>
```

### Bundle Missing Files

Check the build-promotion-bundle.sh script:

```bash
./scripts/release/build-promotion-bundle.sh --tag v4.1.2-rc.1 --commit <sha>
```

### Re-running the Pipeline

Use manual dispatch to re-run without pushing a new tag:

1. Go to Actions → Release RC Pipeline
2. Click "Run workflow"
3. Enter the existing RC tag

---

## Best Practices

1. **Wait for CI**: Let all CI workflows complete before promoting
2. **Use the bundle**: Always use the generated bundle for promotion
3. **Review verification**: Check REQUIRED_CHECKS.txt before promoting
4. **Dry-run first**: Use `--dry-run` before executing promotion
5. **Keep tags**: Don't delete RC tags - they're part of release history

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [RC Preparation](RC_PREPARATION.md)
- [Tag Verification](TAG_VERIFICATION.md)
- [Promotion Bundle](PROMOTION_BUNDLE.md)
- [Required Checks Policy](REQUIRED_CHECKS_POLICY.json)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Release RC Pipeline | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
