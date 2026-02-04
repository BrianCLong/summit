# Evidence Collection Automation

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Evidence Collection system automatically captures and archives verification evidence required for GA release compliance. It collects outputs from all verification commands and maintains a structured evidence archive.

### Key Properties

- **Automated capture**: Collects evidence from CI, security, governance checks
- **Structured storage**: Organized by category with timestamped runs
- **Audit trail**: Complete history of all collection runs
- **Release integration**: Automatically triggered on release tags

---

## Evidence Categories

| Category   | Evidence Types                         | Source                     |
| ---------- | -------------------------------------- | -------------------------- |
| CI         | Build logs, test results, lint reports | pnpm typecheck, test, lint |
| Security   | Dependency audit, SBOM, secret scans   | pnpm audit, gitleaks       |
| Governance | State files, release blockers          | State JSON, GitHub Issues  |
| Audits     | Fresh audit runs, health checks        | Audit scripts              |

---

## Output Structure

```
artifacts/evidence/
├── evidence-summary-YYYYMMDD-HHMMSS.md
├── ci/
│   ├── typescript-build-YYYYMMDD-HHMMSS.log
│   ├── unit-tests-YYYYMMDD-HHMMSS.log
│   └── lint-YYYYMMDD-HHMMSS.log
├── security/
│   ├── dependency-audit-YYYYMMDD-HHMMSS.json
│   ├── sbom-YYYYMMDD-HHMMSS.log
│   └── secret-scan-YYYYMMDD-HHMMSS.json
├── governance/
│   ├── type-safety-state-YYYYMMDD-HHMMSS.json
│   ├── determinism-state-YYYYMMDD-HHMMSS.json
│   ├── health-check-state-YYYYMMDD-HHMMSS.json
│   └── release-blockers-YYYYMMDD-HHMMSS.json
└── audits/
    ├── fresh-dependency-audit-YYYYMMDD-HHMMSS.log
    ├── fresh-type-audit-YYYYMMDD-HHMMSS.log
    └── health-check-YYYYMMDD-HHMMSS.json
```

---

## Workflow Triggers

| Trigger  | Condition             | Action                            |
| -------- | --------------------- | --------------------------------- |
| Schedule | 4 AM UTC Mon-Fri      | Collect all evidence              |
| Tag push | `v*`, `rc-*`          | Collect and archive for release   |
| Manual   | Workflow dispatch     | Selective category collection     |
| Callable | From release workflow | Evidence for release verification |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Evidence Collection
2. Click "Run workflow"
3. Configure options:
   - `category`: Select evidence category (all, ci, security, governance, audits)
   - `update_index`: Update GA_EVIDENCE_INDEX.md with new entries
4. Click "Run workflow"

### Via CLI

```bash
# Collect all evidence
./scripts/release/generate_evidence_bundle.sh

# Collect specific category
./scripts/release/generate_evidence_bundle.sh --category security

# Specify custom output directory
./scripts/release/generate_evidence_bundle.sh --output ./my-evidence

# Update evidence index
./scripts/release/generate_evidence_bundle.sh --update-index

# Dry run (show what would happen)
./scripts/release/generate_evidence_bundle.sh --dry-run

# Show help
./scripts/release/generate_evidence_bundle.sh --help
```

---

## Evidence File Format

Each evidence file includes a header with metadata:

```
# Evidence: typescript_build
# Collected: 2026-01-08T10:30:00Z
# Command: pnpm --filter intelgraph-server typecheck 2>&1 || true
---

[Command output follows...]
```

---

## Summary Report

Each collection run generates a summary report:

```markdown
# Evidence Collection Summary

**Run ID:** 20260108-103000
**Timestamp:** 2026-01-08T10:30:00Z
**Category:** all

## Results

| Evidence         | Status | File                                             |
| ---------------- | ------ | ------------------------------------------------ |
| typescript_build | ✓ pass | `ci/typescript-build-20260108-103000.log`        |
| unit_tests       | ✓ pass | `ci/unit-tests-20260108-103000.log`              |
| dependency_audit | ✓ pass | `security/dependency-audit-20260108-103000.json` |

## Statistics

- **Total:** 10
- **Passed:** 10
- **Failed:** 0
- **Skipped:** 0
```

---

## Integration

### With Release Workflow

```yaml
jobs:
  collect-evidence:
    uses: ./.github/workflows/evidence-collection.yml
    with:
      category: all

  release:
    needs: [collect-evidence, health-check]
    steps:
      - name: Download Evidence
        uses: actions/download-artifact@v4
        with:
          name: evidence-${{ needs.collect-evidence.outputs.run_id }}
```

### With Pre-Release Health Check

Evidence collection runs before the health check (4 AM vs 5 AM) to ensure fresh data is available for release readiness assessment.

### Manual Pre-Release Collection

Before creating a release:

```bash
# Collect fresh evidence
./scripts/release/generate_evidence_bundle.sh --category all

# Review summary
cat artifacts/evidence/evidence-summary-*.md | tail -1

# Then run health check
./scripts/release/pre_release_health_check.sh --report
```

---

## State Tracking

State in `docs/releases/_state/evidence_state.json`:

```json
{
  "version": "1.0.0",
  "last_collection": "2026-01-08T10:30:00Z",
  "last_result": {
    "run_id": "20260108-103000",
    "category": "all",
    "total": 10,
    "passed": 10,
    "failed": 0,
    "output_dir": "artifacts/evidence"
  },
  "collection_history": [
    {
      "timestamp": "2026-01-08T10:30:00Z",
      "run_id": "20260108-103000",
      "category": "all",
      "total": 10,
      "passed": 10,
      "failed": 0
    }
  ]
}
```

---

## Release Archive

For release tags, evidence is archived with extended retention:

1. **Collection**: Evidence collected on tag push
2. **Archive**: Compressed tarball created
3. **Retention**: 365 days (vs 90 for regular runs)
4. **Naming**: `evidence-v1.0.0-20260108-103000.tar.gz`

---

## Troubleshooting

### Collection Failures

If evidence collection fails:

```bash
# Check individual command
pnpm --filter intelgraph-server typecheck

# Run with verbose output
bash -x scripts/release/generate_evidence_bundle.sh --category ci
```

### Missing State Files

If state files are missing:

```bash
# Check state directory
ls -la docs/releases/_state/

# Initialize missing files
echo '{}' > docs/releases/_state/type_safety_state.json
```

### GitHub Token Issues

For release blocker collection:

```bash
# Verify token
gh auth status

# Test query
gh issue list --label release-blocker --state all --limit 5
```

---

## Best Practices

1. **Regular collection**: Run daily to maintain fresh evidence
2. **Pre-release run**: Always collect before tagging
3. **Review failures**: Investigate any collection failures
4. **Archive releases**: Keep release evidence for audit trail
5. **Version control**: Commit state file updates

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Pre-Release Health Check](PRE_RELEASE_HEALTH.md)
- [GA Evidence Index](../release/GA_EVIDENCE_INDEX.md)
- [Dependency Audit](DEPENDENCY_AUDIT.md)
- [Type Safety Audit](TYPE_SAFETY_AUDIT.md)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Evidence Collection | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
