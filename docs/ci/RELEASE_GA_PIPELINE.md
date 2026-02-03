# Release GA Pipeline

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release GA Pipeline is the canonical workflow that handles all GA (General Availability) tag events. It consolidates lineage verification, publish guard checks, and two-person approval into a single authoritative pipeline, ensuring every GA release is traceable to a successful RC.

### Key Properties

- **Single source of truth**: One workflow handles all `v*.*.*` tag events (excluding RC)
- **Unified artifact**: Produces `ga-release-bundle-{tag}` with all release materials
- **Six-stage pipeline**: Gate → Lineage → Verify → Build-Bundle → Publish-Guard → Publish
- **Two-person approval**: Requires `ga-release` environment approval before publishing
- **RC lineage enforcement**: GA SHA must match an RC SHA for the same version

---

## When This Runs

The pipeline automatically triggers on:

1. **GA tag push**: When a `v*.*.*` tag is pushed (excluding `-rc.*` tags)
2. **Manual dispatch**: Re-run without re-pushing tag

### Tag Exclusion

The pipeline explicitly excludes RC tags:

- `v4.1.2` → Triggers pipeline (GA tag)
- `v4.1.2-rc.1` → Does NOT trigger (RC tag, handled by release-rc-pipeline.yml)

---

## Pipeline Stages

### Stage 1: Gate

Validates the tag format and excludes RC tags:

- Must match `v*.*.*` pattern (e.g., `v4.1.2`)
- Must NOT contain `-rc.` suffix
- Sets `is_ga=true` output for downstream jobs

### Stage 2: Lineage Check

Verifies GA SHA matches a successful RC for the same version:

- Uses `verify-rc-lineage.sh` script
- Finds RC tags matching `v{version}-rc.*`
- Confirms GA commit SHA matches RC SHA
- Enforces "publish what was tested" principle

### Stage 3: Verification

Runs the policy-driven verification suite:

- **Policy-driven**: Loads check requirements from `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Deterministic base**: Computes base reference using `compute_base_for_commit.sh`
- **Strict Evidence Generation**:
  - **No Mocks**: Evidence generation fails if tools (k6, syft, trivy) are missing.
  - **Real Security Scans**: Validates against real vulnerability databases.
- TypeScript compilation
- Server build
- Unit tests
- Required conditional checks (based on changed files vs base)

### Governance Integration

The **Antigravity** agent enforces governance at the pipeline level:

- **Artifact Verification**: Verifies presence and validity of `agents/antigravity/policy/*`.
- **Ledger Integrity**: Checks `governance/tradeoffs/tradeoff_ledger.jsonl` for tampering.
- **Strict Compliance**: Fails the build if governance artifacts are missing or invalid.
- **Command**: `npm run compliance:antigravity`

For GA tags, the base is computed to match the corresponding RC's base, ensuring that GA checks are identical to RC checks. This guarantees the "publish what was tested" principle.

### Stage 4: Build GA Bundle

Creates the comprehensive GA release bundle:

- Uses `build-ga-bundle.sh` script
- Generates release notes, operator script, checklist
- Creates `ga_metadata.json` with release information
- Generates `SHA256SUMS` for all artifacts

### Stage 5: Publish Guard

Final verification before publishing:

- Uses `publish_guard.sh` script
- Verifies bundle completeness
- Validates checksums
- Confirms lineage
- Produces pass/fail report

### Stage 6: Assemble & Publish

Uploads artifact and publishes release (with approval):

- Uploads `ga-release-bundle-{tag}` artifact
- Requires two-person approval via `ga-release` environment
- Creates GitHub Release with all materials

---

## Generated Artifact

The pipeline produces a single artifact: `ga-release-bundle-{tag}`

### Bundle Contents

| File                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `ga_metadata.json`        | Machine-readable release metadata |
| `github_release.md`       | GitHub Release description        |
| `publish_to_ga.sh`        | Operator script for publishing    |
| `GA_RELEASE_CHECKLIST.md` | Step-by-step release checklist    |
| `SHA256SUMS`              | Checksums for all artifacts       |
| `verify-rc-lineage.sh`    | Lineage verification script       |
| `verify-green-for-tag.sh` | CI verification script            |
| `pipeline_metadata.json`  | Pipeline execution metadata       |

### Example ga_metadata.json

```json
{
  "version": "1.0.0",
  "bundle_type": "ga-release",
  "generated_at": "2026-01-08T10:00:00Z",
  "generated_by": "build-ga-bundle.sh v1.0.0",
  "release": {
    "ga_tag": "v4.1.2",
    "base_version": "4.1.2",
    "commit_sha": "a8b1963...",
    "source_rc": "v4.1.2-rc.2"
  },
  "workflow": {
    "run_id": "12345678"
  },
  "artifacts": {
    "release_notes": "github_release.md",
    "publish_script": "publish_to_ga.sh",
    "checklist": "GA_RELEASE_CHECKLIST.md",
    "checksums": "SHA256SUMS"
  },
  "verification": {
    "lineage_required": true,
    "two_person_approval": true,
    "publish_guard": true
  }
}
```

---

## Usage

### Automatic (Recommended)

Push a GA tag to trigger the pipeline:

```bash
# Create and push GA tag (pointing to verified RC commit)
git tag -a v4.1.2 -m "Summit Platform v4.1.2 GA"
git push origin v4.1.2
```

The workflow will:

1. Verify this is a GA tag (not RC)
2. Check lineage against RC tags
3. Run verification suite
4. Build GA bundle
5. Run publish guard
6. Upload artifact
7. Wait for two-person approval
8. Create GitHub Release

### Manual Dispatch

Re-run the pipeline without pushing a new tag:

1. Navigate to **Actions → Release GA Pipeline**
2. Click **"Run workflow"**
3. Enter the GA tag (e.g., `v4.1.2`)
4. Click **"Run workflow"**

---

## Two-Person Approval

The publish stage requires approval from the `ga-release` environment:

### Setup Requirements

1. **Environment**: Create `ga-release` environment in GitHub Settings
2. **Required reviewers**: Configure 2 reviewers from release team
3. **Deployment branches**: Limit to `main` and `release/*`

### Approval Flow

1. Pipeline completes through publish-guard stage
2. Workflow pauses at publish job
3. Two authorized reviewers approve in GitHub UI
4. Publish job executes
5. Approval record generated for audit trail

---

## Lineage Verification

### How It Works

The `verify-rc-lineage.sh` script enforces:

1. **Find RC tags**: Searches for `v{version}-rc.*` tags
2. **Get latest RC SHA**: Resolves the commit SHA of latest RC
3. **Compare SHAs**: GA SHA must match RC SHA
4. **Report result**: Pass/fail with detailed output

### Example Verification

```bash
# Verify GA tag points to RC commit
./scripts/release/verify-rc-lineage.sh \
  --ga-tag v4.1.2 \
  --ga-sha abc123 \
  --require-success

# Output:
# [SUCCESS] GA tag v4.1.2 points to the same commit as v4.1.2-rc.2
# [SUCCESS] Lineage verified: GA commit matches latest successful RC
```

### Why Lineage Matters

- Ensures "publish what was tested" principle
- Prevents accidental changes between RC and GA
- Creates auditable trail from RC testing to GA release
- Blocks untested code from reaching production

---

## Relationship to Other Workflows

### Supersedes

The Release GA Pipeline supersedes the tag push triggers in:

- **GA Release** (`release-ga.yml`) - Now manual-only (legacy)
- **GA Release ga/v\*** (`ga-release.yml`) - Now manual-only (deprecated tag pattern)
- **Supply Chain Integrity** (`supply-chain-integrity.yml`) - Tag triggers removed

### Works With

- **Release RC Pipeline** (`release-rc-pipeline.yml`) - Produces the RC that this pipeline verifies
- **Two-Person Approval** - Uses `ga-release` environment

### Pipeline Flow

```
Release RC Pipeline
    ↓
  Produces verified RC
    ↓
  RC testing and validation
    ↓
Release GA Pipeline (GA tag push)
    ↓
  Verifies lineage → RC SHA match
    ↓
  Runs verification suite
    ↓
  Builds GA bundle
    ↓
  Runs publish guard
    ↓
  Two-person approval (ga-release env)
    ↓
  Publishes GitHub Release
```

---

## Configuration

### Workflow Inputs (Manual Dispatch)

| Input | Description       | Default  |
| ----- | ----------------- | -------- |
| `tag` | GA tag to process | Required |

### Concurrency

The workflow uses concurrency groups to prevent parallel runs:

```yaml
concurrency:
  group: release-ga-${{ github.ref_name || inputs.tag }}
  cancel-in-progress: false
```

### Environment Variables

| Variable           | Description                |
| ------------------ | -------------------------- |
| `TAG`              | GA tag being processed     |
| `SHA`              | Commit SHA                 |
| `BASE_VERSION`     | Version without `v` prefix |
| `LINEAGE_VERIFIED` | RC lineage check result    |

---

## Scripts

### verify-rc-lineage.sh

Verifies GA tag points to a successful RC SHA.

```bash
./scripts/release/verify-rc-lineage.sh \
  --ga-tag v4.1.2 \
  --ga-sha abc123 \
  --require-success \
  --json
```

| Flag                | Description                     |
| ------------------- | ------------------------------- |
| `--ga-tag TAG`      | GA tag to verify                |
| `--ga-sha SHA`      | Commit SHA the GA tag points to |
| `--require-success` | Fail if no matching RC found    |
| `--json`            | Output in JSON format           |
| `--verbose`         | Enable verbose output           |

### build-ga-bundle.sh

Creates the GA release bundle with all artifacts.

```bash
./scripts/release/build-ga-bundle.sh \
  --tag v4.1.2 \
  --sha abc123 \
  --output ./ga-bundle
```

| Flag                | Description                   |
| ------------------- | ----------------------------- |
| `--tag TAG`         | GA tag (e.g., v4.1.2)         |
| `--sha SHA`         | Commit SHA                    |
| `--output DIR`      | Output directory              |
| `--rc-tag TAG`      | Source RC tag (auto-detected) |
| `--workflow-run ID` | GitHub workflow run ID        |

### publish_guard.sh

Final verification before publishing.

```bash
./scripts/release/publish_guard.sh \
  --tag v4.1.2 \
  --sha abc123 \
  --bundle-dir ./ga-bundle
```

| Flag               | Description                |
| ------------------ | -------------------------- |
| `--tag TAG`        | GA tag to verify           |
| `--sha SHA`        | Commit SHA                 |
| `--bundle-dir DIR` | Bundle directory to verify |
| `--strict`         | Fail on any warning        |
| `--json`           | Output in JSON format      |

---

## Troubleshooting

### Pipeline Fails at Gate (RC Tag Detected)

The pipeline correctly skipped an RC tag:

```bash
# RC tags trigger release-rc-pipeline.yml instead
# Check that the correct pipeline ran
gh run list --workflow=release-rc-pipeline.yml
```

### Lineage Check Fails

```bash
# Verify the GA SHA matches an RC
./scripts/release/verify-rc-lineage.sh \
  --ga-tag v4.1.2 \
  --ga-sha abc123 \
  --verbose

# Common causes:
# 1. GA tag points to a commit that wasn't an RC
# 2. No RC tags exist for this version
# 3. New commits added after RC
```

### Publish Guard Fails

```bash
# Run publish guard locally
./scripts/release/publish_guard.sh \
  --tag v4.1.2 \
  --sha abc123 \
  --bundle-dir ./ga-bundle \
  --verbose
```

### Two-Person Approval Not Working

1. Verify `ga-release` environment exists
2. Check required reviewers are configured
3. Verify deployment branch restrictions
4. Ensure approvers have correct permissions

### Re-running the Pipeline

Use manual dispatch to re-run without pushing a new tag:

1. Go to Actions → Release GA Pipeline
2. Click "Run workflow"
3. Enter the existing GA tag

---

## Best Practices

1. **Create RC first**: Always have a verified RC before GA
2. **Wait for CI**: Let all CI workflows complete on the RC
3. **Use the bundle**: Always use the generated bundle for publishing
4. **Review lineage**: Check lineage verification before approving
5. **Two reviewers**: Ensure two different people approve
6. **Keep tags**: Don't delete RC or GA tags - they're part of release history

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Release RC Pipeline](RELEASE_RC_PIPELINE.md)
- [Two-Person Approval](../releases/TWO_PERSON_APPROVAL.md)
- [Required Checks Policy](REQUIRED_CHECKS.md)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Release GA Pipeline | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
