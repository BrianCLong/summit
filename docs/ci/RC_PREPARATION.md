# RC Preparation

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The RC (Release Candidate) Preparation system automates the creation of stabilization release candidates with proper versioning, artifact generation, and evidence collection.

### Key Properties

- **Deterministic**: Same commit produces identical artifacts
- **Version auto-detection**: Automatically computes next RC version
- **Artifact generation**: Creates evidence pack and release materials
- **Safe by default**: Dry-run mode prevents accidental tagging

---

## When to Use

Use RC preparation when:

1. **Starting stabilization**: Create initial RC from main branch
2. **Including fixes**: Create subsequent RCs with bug fixes
3. **Pre-GA verification**: Final RC before GA promotion

---

## RC Naming Convention

```
v{major}.{minor}.{patch}-rc.{number}
```

Examples:

- `v4.1.2-rc.1` - First RC for v4.1.2
- `v4.1.2-rc.2` - Second RC with fixes
- `v4.1.2-rc.3` - Third RC before GA

---

## Usage

### Via GitHub Actions (Recommended)

The **single-button deterministic** approach:

1. Navigate to **Actions → RC Preparation**
2. Click **"Run workflow"**
3. Fill in optional fields:
   - `base_version`: Base version (e.g., `4.1.2`)
   - `commit_sha`: Target commit (default: main HEAD)
4. Click **"Run workflow"**
5. Download the `rc-prep-bundle-{tag}` artifact
6. Run `commands.sh` from the bundle to create the RC

```bash
# After downloading and extracting the artifact:
cd rc-prep-bundle-v4.1.2-rc.1
chmod +x commands.sh
./commands.sh
```

### Via CLI (Dry Run - Default)

```bash
# Preview what would happen without creating tags
./scripts/release/prepare-stabilization-rc.sh --dry-run

# Or simply (dry-run is default)
./scripts/release/prepare-stabilization-rc.sh
```

### Via CLI (Live Mode - Creates Tags)

```bash
# Create actual RC tag
./scripts/release/prepare-stabilization-rc.sh --live

# With explicit version and commit
./scripts/release/prepare-stabilization-rc.sh --live --version v4.1.2-rc.1 --commit a8b1963
```

### Via CLI (CI Mode - JSON Output)

```bash
# For CI integration with JSON output
./scripts/release/prepare-stabilization-rc.sh --dry-run --json --commit $(git rev-parse HEAD)
```

---

## Configuration Options

### CLI Options

| Option      | Description                          | Default       |
| ----------- | ------------------------------------ | ------------- |
| `--dry-run` | Preview without tagging              | true          |
| `--live`    | Execute actual git operations        | false         |
| `--verbose` | Enable verbose logging               | false         |
| `--json`    | Output JSON for CI integration       | false         |
| `--version` | Override version (e.g., v4.1.2-rc.1) | Auto-detected |
| `--commit`  | Target commit SHA                    | HEAD          |
| `--help`    | Show help message                    | -             |

### Workflow Inputs

| Input               | Description                  | Default     |
| ------------------- | ---------------------------- | ----------- |
| `base_version`      | Base version (e.g., 4.1.2)   | Auto-detect |
| `commit_sha`        | Target commit SHA            | main HEAD   |
| `dry_run`           | Dry run mode                 | true        |
| `skip_verification` | Skip release readiness check | false       |

### Environment Variables

| Variable      | Description                      | Default |
| ------------- | -------------------------------- | ------- |
| `DRY_RUN`     | Set to 'false' for live mode     | true    |
| `VERBOSE`     | Set to 'true' for verbose output | false   |
| `JSON_OUTPUT` | Set to 'true' for JSON output    | false   |

---

## Version Detection

The script automatically detects the next version:

1. **Find latest tag**: Looks for `v*.*.*` or `v*.*.*-rc.*`
2. **Determine next version**:
   - If latest is RC (e.g., `v4.1.2-rc.1`): Increment RC number → `v4.1.2-rc.2`
   - If latest is GA (e.g., `v4.1.1`): Increment patch, start RC → `v4.1.2-rc.1`
3. **Fallback**: Uses package.json version if no tags found

---

## Generated Artifacts

Artifacts are stored in `artifacts/release/{tag}/`:

| File                | Description                                 |
| ------------------- | ------------------------------------------- |
| `commands.sh`       | Executable script to create and push RC tag |
| `summary.json`      | Machine-readable bundle metadata            |
| `github_release.md` | GitHub Release description                  |
| `commits.txt`       | List of commits since last tag              |
| `evidence.json`     | Verification commands and metadata          |
| `release_notes.md`  | Copy of release notes template              |
| `evidence_pack.md`  | Copy of evidence pack template              |

### Example commands.sh

The generated script handles all tagging steps:

```bash
#!/usr/bin/env bash
# Step 1: Create the annotated tag
git tag -a "v4.1.2-rc.1" a8b1963 -m "MVP-4 Stabilization RC..."

# Step 2: Push the tag
git push origin "v4.1.2-rc.1"

# Step 3: Create GitHub Release
gh release create "v4.1.2-rc.1" --prerelease --title "..."
```

### Example evidence.json

```json
{
  "version": "1.0.0",
  "release": {
    "tag": "v4.1.2-rc.1",
    "commit_sha": "a8b1963...",
    "generated_at": "2026-01-08T10:00:00Z",
    "generated_by": "prepare-stabilization-rc.sh v1.0.0"
  },
  "verification": {
    "commands": [
      "pnpm ga:verify",
      "pnpm --filter intelgraph-server test:ci",
      "pnpm run security:check",
      "pnpm run generate:sbom",
      "docker build -t intelgraph:v4.1.2-rc.1 ."
    ],
    "ci_workflows": [
      ".github/workflows/ci-core.yml",
      ".github/workflows/unit-test-coverage.yml",
      ".github/workflows/ga-gate.yml"
    ]
  },
  "deterministic": true
}
```

---

## Workflow

### Step 1: Verify CI Green

```bash
# Ensure all checks pass
gh run list --commit $(git rev-parse HEAD)
```

### Step 2: Dry Run

```bash
# Preview RC creation
./scripts/release/prepare-stabilization-rc.sh --dry-run --verbose
```

### Step 3: Create RC

```bash
# Create the RC tag
./scripts/release/prepare-stabilization-rc.sh --live
```

### Step 4: Push Tag

```bash
# Push to remote (triggers CI)
git push origin v4.1.2-rc.1
```

### Step 5: Monitor CI

```bash
# Watch workflow progress
gh run watch
```

### Step 6: Generate Promotion Bundle

```bash
# Create bundle for eventual GA promotion
./scripts/release/build-promotion-bundle.sh \
  --tag v4.1.2-rc.1 \
  --commit $(git rev-parse HEAD)
```

---

## Pre-Flight Checks

The script performs these checks before proceeding:

1. **Clean working tree**: No uncommitted changes
2. **Valid version format**: Matches `vX.Y.Z-rc.N`
3. **Tag existence**: Validates against existing tags

---

## Output Example

```
=== MVP-4 Stabilization RC Preparation ===
[INFO] Script version: 1.0.0
[INFO] Mode: DRY-RUN

[SUCCESS] Working tree is clean
[SUCCESS] Auto-detected next version: v4.1.2-rc.1
[INFO] Current commit: a8b1963...

[INFO] Creating release artifacts for v4.1.2-rc.1...
[INFO] Generating commit list for range: v4.1.1..HEAD
[SUCCESS] Generated 15 commits to artifacts/release/v4.1.2-rc.1/commits.txt
[SUCCESS] Generated evidence.json
[SUCCESS] Copied release notes template
[SUCCESS] Copied evidence pack template
[SUCCESS] Release artifacts created in artifacts/release/v4.1.2-rc.1/

==================================
[SUCCESS] Release preparation complete!
==================================

[INFO] Tag: v4.1.2-rc.1
[INFO] Commit: a8b1963...
[INFO] Mode: DRY-RUN

[WARN] This was a DRY RUN. No git tags were created.

NEXT STEPS (when CI is green):

  1. Verify CI is green:
     gh run list --commit a8b1963

  2. Run local verification:
     pnpm ga:verify

  3. Create the RC tag (LIVE MODE):
     DRY_RUN=false ./scripts/release/prepare-stabilization-rc.sh

  4. Push the tag:
     git push origin v4.1.2-rc.1
```

---

## Integration Points

### With Tag Verification

After creating RC, verify before promoting:

```bash
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1
```

### With Promotion Bundle

Generate bundle for GA promotion:

```bash
./scripts/release/build-promotion-bundle.sh \
  --tag v4.1.2-rc.1 \
  --commit a8b1963
```

### With Evidence Collection

Evidence is automatically collected by the daily workflow:

```bash
# Manual collection
./scripts/release/generate_evidence_bundle.sh --type rc
```

---

## Best Practices

1. **Always dry-run first**: Verify what will happen
2. **Wait for green CI**: Don't tag until all checks pass
3. **Use auto-detection**: Let script compute version unless override needed
4. **Document fixes**: Update release notes for each RC
5. **Review artifacts**: Check generated files before pushing

---

## Troubleshooting

### "Working tree is not clean"

```bash
# Check uncommitted changes
git status

# Commit or stash changes
git stash push -m "WIP before RC"
```

### "Cannot parse tag"

```bash
# List all tags
git tag -l 'v*.*.*' --sort=-v:refname

# Use explicit version
./scripts/release/prepare-stabilization-rc.sh --version v4.1.2-rc.1
```

### "Tag already exists"

```bash
# Check if tag exists
git tag -l v4.1.2-rc.1

# Increment RC number
./scripts/release/prepare-stabilization-rc.sh --version v4.1.2-rc.2
```

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Tag Verification](TAG_VERIFICATION.md)
- [Promotion Bundle](PROMOTION_BUNDLE.md)
- [Required Checks Policy](REQUIRED_CHECKS_POLICY.json)

---

## Change Log

| Date       | Change                               | Author               |
| ---------- | ------------------------------------ | -------------------- |
| 2026-01-08 | Initial RC Preparation documentation | Platform Engineering |
| 2026-01-08 | Added workflow and commands.sh       | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
