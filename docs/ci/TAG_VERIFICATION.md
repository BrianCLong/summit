# Tag Verification

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Tag Verification system ensures commits are safe for RC/GA promotion by verifying all required CI checks have passed. It implements a truth table-based approach where workflow requirements depend on which files changed.

### Key Properties

- **Conditional checks**: Different workflows required based on changed paths
- **Always-required checks**: Core workflows that must always pass
- **Visual truth table**: Clear pass/fail rendering
- **Policy-driven**: Requirements defined in REQUIRED_CHECKS_POLICY.json

---

## When to Use

Use tag verification:

1. **Before RC creation**: Verify commit is green before tagging
2. **Before GA promotion**: Ensure RC remains green before promoting
3. **CI gates**: Automated verification in promotion workflows
4. **Manual checks**: Debug failing promotions

---

## Verification Process

### Workflow Types

| Type                       | Description                         | Example                               |
| -------------------------- | ----------------------------------- | ------------------------------------- |
| **Always Required**        | Must pass for every commit          | CI Core, Unit Tests, GA Gate          |
| **Conditionally Required** | Must pass if specific paths changed | Docker builds (if Dockerfile changed) |
| **Informational**          | Not blocking, but tracked           | Preview deployments                   |

### Truth Table

The script generates a visual truth table:

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          PROMOTION GATE TRUTH TABLE                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║ Tag:     v4.1.2-rc.1
║ Commit:  a8b1963 (a8b1963...)
║ Base:    a8b1963^
║ Changed: 15 files
╚════════════════════════════════════════════════════════════════════════════════╝

WORKFLOW                            | REQUIRED    | STATUS       | RESULT
────────────────────────────────────────────────────────────────────────────────────
CI Core (Primary Gate)              | ALWAYS      | ✅ SUCCESS   | PASS
Unit Test & Coverage                | ALWAYS      | ✅ SUCCESS   | PASS
Release Readiness Gate              | ALWAYS      | ✅ SUCCESS   | PASS
Docker Build                        | COND        | ⏭️ N/A       | N/A
Supply Chain Integrity              | COND        | ✅ SUCCESS   | PASS
```

---

## Usage

### Via CLI

```bash
# Verify tag before promotion
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1

# Verify specific commit
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --commit a8b1963

# Verbose output showing changed files
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --verbose

# With explicit base for diff
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --base origin/main~5
```

### Via GitHub Actions

```yaml
- name: Verify Green for Tag
  run: |
    chmod +x scripts/release/verify-green-for-tag.sh
    ./scripts/release/verify-green-for-tag.sh \
      --tag ${{ github.ref_name }} \
      --commit ${{ github.sha }}
```

---

## Configuration Options

| Option      | Description             | Default       |
| ----------- | ----------------------- | ------------- |
| `--tag`     | Tag to verify           | Required      |
| `--commit`  | Commit SHA to verify    | HEAD          |
| `--base`    | Base reference for diff | Parent commit |
| `--branch`  | Branch context          | main          |
| `--verbose` | Enable verbose output   | false         |
| `--help`    | Show help message       | -             |

---

## Policy Configuration

Requirements are defined in `docs/ci/REQUIRED_CHECKS_POLICY.json`:

```json
{
  "version": "1.0.0",
  "always_required": [
    {
      "name": "CI Core (Primary Gate)",
      "description": "Main CI pipeline"
    },
    {
      "name": "Unit Test & Coverage",
      "description": "Test suite and coverage checks"
    }
  ],
  "conditional_required": [
    {
      "name": "Docker Build",
      "description": "Container build verification",
      "required_when_paths_match": ["Dockerfile", "docker-compose.*", ".dockerignore"]
    },
    {
      "name": "Supply Chain Integrity",
      "description": "SBOM and dependency audit",
      "required_when_paths_match": ["package.json", "pnpm-lock.yaml"]
    }
  ],
  "informational": [
    {
      "name": "Preview Deploy",
      "description": "Non-blocking preview deployment"
    }
  ]
}
```

---

## Exit Codes

| Code | Meaning                           | Action                        |
| ---- | --------------------------------- | ----------------------------- |
| `0`  | All required checks passed        | Safe to promote               |
| `1`  | One or more checks failed/missing | Fix failures before promoting |
| `2`  | Invalid arguments or environment  | Check usage and dependencies  |

---

## Integration Points

### With RC Preparation

```bash
# Verify before creating RC
./scripts/release/verify-green-for-tag.sh --tag v4.1.2-rc.1 --commit $(git rev-parse HEAD)

# If green, create RC
./scripts/release/prepare-stabilization-rc.sh --live
```

### With Promotion Bundle

```bash
# Build promotion bundle (includes verification)
./scripts/release/build-promotion-bundle.sh --tag v4.1.2-rc.1 --commit a8b1963
```

### With GA Promotion

The generated `promote_to_ga.sh` script re-verifies before creating GA tag:

```bash
cd artifacts/promotion-bundles/v4.1.2-rc.1
./promote_to_ga.sh --dry-run  # Preview
./promote_to_ga.sh            # Execute
```

---

## Troubleshooting

### Verification Fails

```bash
# Check which workflows exist for commit
gh run list --commit <sha>

# View specific workflow run
gh run view <run-id>

# Check workflow logs
gh run view <run-id> --log
```

### Missing Workflows

If workflows show as MISSING:

1. Wait for CI to complete if still running
2. Check if workflow was triggered
3. Verify commit is pushed to remote
4. Check workflow path filters

### Conditional Checks Not Running

```bash
# Verify which files changed
git diff --name-only <base>..<commit>

# Compare against policy patterns
cat docs/ci/REQUIRED_CHECKS_POLICY.json | jq '.conditional_required'
```

---

## Best Practices

1. **Always verify before tagging**: Run verification before any RC/GA tag
2. **Use verbose mode for debugging**: `--verbose` shows exactly what's being checked
3. **Keep policy current**: Update REQUIRED_CHECKS_POLICY.json when adding workflows
4. **Dry-run promotions**: Use `--dry-run` in promotion scripts first

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Promotion Bundle](PROMOTION_BUNDLE.md)
- [Required Checks Policy](REQUIRED_CHECKS_POLICY.json)
- [RC Preparation](../releases/MVP-4_STABILIZATION_TAGGING.md)

---

## Change Log

| Date       | Change                                 | Author               |
| ---------- | -------------------------------------- | -------------------- |
| 2026-01-08 | Initial Tag Verification documentation | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
