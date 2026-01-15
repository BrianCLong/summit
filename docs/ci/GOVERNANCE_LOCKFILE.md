# Governance Lockfile

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Governance Lockfile is a cryptographic snapshot of all governance policies and state flags in effect at release time. It provides audit-grade traceability between operational behavior and the exact policy configuration that governed the release.

### The Problem

Without governance lockfiles:

- No record of which policies were in effect during a release
- Difficult to correlate incidents with policy configuration
- Cannot prove compliance at a specific point in time
- Policy changes between RC and GA go undetected

### The Solution

Every RC and GA bundle includes:

1. Copies of all governance policy files
2. Copies of all governance state flags
3. SHA256 hashes for each file
4. A manifest (`governance_lockfile.json`) tying everything to a commit

---

## What's Included

### Policy Files

| File                               | Description             |
| ---------------------------------- | ----------------------- |
| `REQUIRED_CHECKS_POLICY.yml`       | CI check requirements   |
| `REQUIRED_CHECKS_EXCEPTIONS.yml`   | Intentional deviations  |
| `ERROR_BUDGET_POLICY.yml`          | Budget allocations      |
| `REDACTION_POLICY.yml`             | Content redaction rules |
| `PAGES_PUBLISH_ALLOWLIST.md`       | Allowed Pages files     |
| `REDACTION_TREND_ALERT_POLICY.yml` | Alert thresholds        |
| `RELEASE_OPS_SLO_POLICY.yml`       | SLO targets             |
| `BLOCKER_ESCALATION_POLICY.yml`    | Escalation rules        |
| `ONCALL_HANDOFF_POLICY.yml`        | Shift schedules         |
| `TRIAGE_ROUTING_POLICY.yml`        | Team routing            |
| `REMEDIATION_PLAYBOOKS.yml`        | Auto-fix playbooks      |
| `TEST_QUARANTINE_POLICY.yml`       | Quarantine rules        |
| `CHANGELOG_POLICY.yml`             | Changelog categories    |
| `DEPENDENCY_AUDIT_POLICY.yml`      | Audit thresholds        |
| `TYPE_SAFETY_POLICY.yml`           | Any type limits         |
| `API_DETERMINISM_POLICY.yml`       | Endpoint checks         |

### State Flags

| File                         | Description          |
| ---------------------------- | -------------------- |
| `freeze_mode.json`           | Change freeze status |
| `release_override.json`      | Override state       |
| `governance_tight_mode.json` | Tight mode flag      |
| `error_budget_state.json`    | Budget consumption   |

---

## Lockfile Structure

### Bundle Layout

```
bundle/
├── governance/
│   ├── governance_lockfile.json    # Manifest
│   ├── governance_SHA256SUMS       # Checksums
│   ├── signatures/                 # Optional signatures
│   │   ├── governance_SHA256SUMS.sig
│   │   └── governance_SHA256SUMS.crt
│   └── snapshot/
│       ├── docs/
│       │   └── ci/
│       │       ├── REQUIRED_CHECKS_POLICY.yml
│       │       ├── ERROR_BUDGET_POLICY.yml
│       │       └── ...
│       └── docs/
│           └── releases/
│               └── _state/
│                   ├── freeze_mode.json
│                   └── ...
├── ga_metadata.json                # Bundle metadata
├── SHA256SUMS                      # Top-level checksums
└── ...
```

### governance_lockfile.json Schema

```json
{
  "version": "1.0",
  "schema_version": "1.0.0",
  "tag": "v4.1.2",
  "sha": "abc123def456...",
  "generated_at_utc": "2026-01-08T12:00:00Z",
  "generator": "generate_governance_lockfile.sh v1.0.0",
  "summary": {
    "total_files": 15,
    "policy_files": 12,
    "state_files": 3,
    "missing_files": 0
  },
  "files": [
    {
      "path": "snapshot/docs/ci/REQUIRED_CHECKS_POLICY.yml",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb924...",
      "bytes": 1234
    }
  ]
}
```

---

## Verification

### Offline Verification

Consumers can verify bundle integrity without network access:

```bash
# Download and extract the bundle
tar -xzf v4.1.2-bundle.tar.gz
cd v4.1.2-bundle

# Verify top-level checksums
sha256sum -c SHA256SUMS

# Verify governance lockfile
cd governance && sha256sum -c governance_SHA256SUMS && cd ..

# Or use the verification script
./verify_release_bundle.sh --bundle-dir .
```

### Verification Script

The `verify_release_bundle.sh` script performs comprehensive verification:

```bash
./scripts/release/verify_release_bundle.sh --bundle-dir ./my-bundle

# With verbose output
./scripts/release/verify_release_bundle.sh --bundle-dir ./my-bundle --verbose

# Strict mode (warnings are errors)
./scripts/release/verify_release_bundle.sh --bundle-dir ./my-bundle --strict

# JSON output for CI
./scripts/release/verify_release_bundle.sh --bundle-dir ./my-bundle --json
```

### Publish Guard

The publish guard (`publish_guard.sh`) requires governance lockfile for GA releases:

```bash
./scripts/release/publish_guard.sh \
  --tag v4.1.2 \
  --sha abc123 \
  --bundle-dir ./ga-bundle

# Checks performed:
# - governance/governance_lockfile.json exists
# - governance/governance_SHA256SUMS exists and verifies
# - Lockfile SHA matches GA SHA
# - Lockfile contains policy files
```

---

## Generation

### Manual Generation

```bash
# Generate for current HEAD
./scripts/release/generate_governance_lockfile.sh \
  --sha $(git rev-parse HEAD)

# Generate for a specific tag
./scripts/release/generate_governance_lockfile.sh \
  --sha abc123 \
  --tag v4.1.2 \
  --out-dir ./bundle/governance

# With verbose output
./scripts/release/generate_governance_lockfile.sh \
  --sha abc123 \
  --verbose
```

### Automatic Generation

The lockfile is automatically generated during:

- `build-ga-bundle.sh` for GA releases
- `build-promotion-bundle.sh` for RC bundles

---

## Bundle Integration

### ga_metadata.json

GA bundles include a governance lockfile reference:

```json
{
  "version": "1.1.0",
  "governance_lockfile": {
    "path": "governance/governance_lockfile.json",
    "sha256": "abc123...",
    "sums_path": "governance/governance_SHA256SUMS"
  },
  "verification": {
    "governance_lockfile_required": true
  }
}
```

### Top-Level SHA256SUMS

The top-level checksums include governance files:

```
./governance/governance_lockfile.json
./governance/governance_SHA256SUMS
./governance/snapshot/docs/ci/REQUIRED_CHECKS_POLICY.yml
...
```

---

## Signing (Optional)

If cosign is available, the lockfile can be signed:

```bash
./scripts/release/generate_governance_lockfile.sh \
  --sha abc123 \
  --sign

# Outputs:
# governance/signatures/governance_SHA256SUMS.sig
# governance/signatures/governance_SHA256SUMS.crt
```

Verification with cosign:

```bash
cosign verify-blob \
  --signature governance/signatures/governance_SHA256SUMS.sig \
  --certificate governance/signatures/governance_SHA256SUMS.crt \
  governance/governance_SHA256SUMS
```

---

## Governance Hash Correlation

### Overview

The governance hash (SHA256 of the governance lockfile) is embedded in operational artifacts to enable correlation between runtime behavior and the exact policy configuration that was in effect.

### Embedded Locations

| Artifact                            | Field                         | Purpose                                    |
| ----------------------------------- | ----------------------------- | ------------------------------------------ |
| `deployment_marker.json`            | `governance_hash`             | Correlate deployed content with policies   |
| `release_ops_slo.json`              | `governance_hash`             | Correlate SLO metrics with policy config   |
| `error_budget.json`                 | `governance_hash`             | Correlate budget consumption with policies |
| `redaction_metrics_timeseries.json` | `governance_hash` (per entry) | Historical correlation per publish cycle   |
| GA Bundles                          | `governance_lockfile.sha256`  | Verify bundle policy integrity             |

### Usage Example

```bash
# View governance hash in deployment marker
jq '.governance_hash' site/release-ops/deployment_marker.json
# Output: "e3b0c44298fc1c149afbf4c8996fb924..."

# View governance hash in SLO report
jq '.governance_hash' site/release-ops/slo_report.json
# Output: "e3b0c44298fc1c149afbf4c8996fb924..."

# Compare with lockfile to verify policy version
sha256sum docs/releases/_state/governance_lockfile.json | cut -d' ' -f1
```

### Auto-Detection

Both `write_deployment_marker.sh` and `compute_release_ops_slo.sh` support auto-detection of the governance hash when not explicitly provided:

```bash
# Explicit hash
./scripts/release/write_deployment_marker.sh \
  --status OK \
  --governance-hash abc123...

# Auto-detect from governance_lockfile.json
./scripts/release/write_deployment_marker.sh --status OK
# Hash is auto-detected if docs/releases/_state/governance_lockfile.json exists
```

### Benefits

1. **Incident Correlation**: When investigating issues, immediately identify which policies were active
2. **Drift Detection**: Compare hashes across time to detect policy changes
3. **Audit Trail**: Prove compliance by correlating operational metrics with specific policy versions
4. **Rollback Context**: Understand which policy version governed a rolled-back deployment

---

## Governance Drift Detection

### Overview

The governance drift checker (`check_governance_drift.sh`) analyzes the time series to detect when governance policies changed between publish cycles. This helps identify unexpected policy changes during stabilization.

### Usage

```bash
# Basic drift check
./scripts/release/check_governance_drift.sh \
  --timeseries site/release-ops/redaction_metrics_timeseries.json

# Check against current hash
./scripts/release/check_governance_drift.sh \
  --timeseries timeseries.json \
  --current-hash $(sha256sum docs/releases/_state/governance_lockfile.json | cut -d' ' -f1)

# JSON output for automation
./scripts/release/check_governance_drift.sh \
  --timeseries timeseries.json \
  --json

# CI alert mode (exits non-zero on drift)
./scripts/release/check_governance_drift.sh \
  --timeseries timeseries.json \
  --alert-on-change
```

### Output

```json
{
  "drift_detected": true,
  "transitions_count": 2,
  "transitions": [
    {
      "date": "2026-01-07",
      "from_hash": "abc123...",
      "to_hash": "def456...",
      "health_after": "OK"
    }
  ],
  "summary": {
    "stable": false,
    "changes_in_window": 2
  }
}
```

### Automated Monitoring

The `governance-drift-check.yml` workflow:

- Runs daily at 11:00 UTC
- Runs on policy file changes
- Creates GitHub issues when drift is detected
- Uploads drift reports as artifacts

---

## Use Cases

### Incident Investigation

When investigating an incident:

1. Identify the release version in production
2. Download the corresponding bundle
3. Extract the governance lockfile
4. Review the policies that were in effect

```bash
# View the freeze mode at release time
cat governance/snapshot/docs/releases/_state/freeze_mode.json

# View the error budget policy
cat governance/snapshot/docs/ci/ERROR_BUDGET_POLICY.yml
```

### Compliance Audit

For compliance audits:

1. Collect bundles for the audit period
2. Verify each bundle's integrity
3. Extract governance lockfiles
4. Compare policy versions across releases

```bash
# Verify all bundles
for bundle in v4.1.0 v4.1.1 v4.1.2; do
  ./verify_release_bundle.sh --bundle-dir "./${bundle}-bundle"
done
```

### Policy Drift Detection

Detect policy changes between releases:

```bash
# Extract lockfiles
jq -r '.files[].sha256' v4.1.1-bundle/governance/governance_lockfile.json > old.txt
jq -r '.files[].sha256' v4.1.2-bundle/governance/governance_lockfile.json > new.txt

# Compare
diff old.txt new.txt
```

---

## Troubleshooting

### "Governance lockfile not found"

The lockfile generator didn't run or failed.

**Solutions:**

- Check if `generate_governance_lockfile.sh` exists
- Review bundle builder logs for errors
- Regenerate the bundle

### "Governance checksums failed"

Files were modified after lockfile generation.

**Solutions:**

- Verify the bundle wasn't tampered with
- Re-download the bundle from trusted source
- Check for file system issues

### "Lockfile SHA mismatch"

The lockfile was generated for a different commit.

**Solutions:**

- Verify the correct bundle is being used
- Check if bundle was rebuilt with different SHA
- Review bundle metadata for correct SHA

### "Missing policy files"

Some expected policy files weren't found at generation time.

**Solutions:**

- This is often expected for optional policies
- Check `summary.missing_files` in lockfile
- Verify the commit has all expected policies

---

## Schema Versioning

### Current Version

- **Schema Version:** 1.0.0
- **Lockfile Version:** 1.0

### Bumping Version

If the schema changes:

1. Update `schema_version` in generator
2. Update documentation
3. Update verification scripts if needed
4. Add migration notes for consumers

### Compatibility

- Verifiers should check `version` field
- Unknown fields should be ignored
- Required fields must always be present

---

## References

- **Generator Script:** `scripts/release/generate_governance_lockfile.sh`
- **Verification Script:** `scripts/release/verify_release_bundle.sh`
- **Publish Guard:** `scripts/release/publish_guard.sh`
- **GA Bundle Builder:** `scripts/release/build-ga-bundle.sh`
- **RC Bundle Builder:** `scripts/release/build-promotion-bundle.sh`
- **Deployment Marker:** `scripts/release/write_deployment_marker.sh` (includes governance hash)
- **SLO Computation:** `scripts/release/compute_release_ops_slo.sh` (includes governance hash)
- **SLO Renderer:** `scripts/release/render_release_ops_slo_report.sh` (displays governance hash)
- **Error Budget:** `scripts/release/compute_error_budget.sh` (includes governance hash)
- **Error Budget Renderer:** `scripts/release/render_error_budget_panel.sh` (displays governance hash)
- **Time Series Updater:** `scripts/release/update_redaction_metrics_timeseries.sh` (includes governance hash per entry)
- **Drift Checker:** `scripts/release/check_governance_drift.sh` (detects policy changes)
- **Drift Workflow:** `.github/workflows/governance-drift-check.yml` (automated monitoring)
- **Policy Validator:** `scripts/release/validate_governance_policies.sh` (validates policy syntax and fields)
- **Validation Workflow:** `.github/workflows/governance-policy-validation.yml` (CI validation)
- **Governance Dashboard:** `scripts/release/render_governance_dashboard.sh` (comprehensive status overview)
- **Dashboard Publish Workflow:** `.github/workflows/governance-dashboard-publish.yml` (automated dashboard publishing)
- **Lockfile Verifier:** `scripts/release/verify_governance_lockfile.sh` (integrity and freshness verification)
- **Lockfile Verify Workflow:** `.github/workflows/governance-lockfile-verify.yml` (CI verification)
- **Health Checker:** `scripts/release/compute_governance_health.sh` (aggregated health scoring)
- **Governance Gate:** `.github/workflows/_reusable-governance-gate.yml` (release pipeline gate)
- **Audit Log Update:** `scripts/release/update_governance_audit_log.sh` (append audit entries)
- **Audit Log Query:** `scripts/release/query_governance_audit_log.sh` (query and view audit log)
- **Report Generator:** `scripts/release/generate_governance_report.sh` (comprehensive periodic reports)
- **Compliance Checker:** `scripts/release/check_governance_compliance.sh` (full compliance audit)

---

## Change History

| Version | Date       | Changes                                                   |
| ------- | ---------- | --------------------------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial governance lockfile implementation                |
| 1.1.0   | 2026-01-08 | Added governance hash correlation to markers/SLO          |
| 1.2.0   | 2026-01-08 | Extended governance hash to error budget and time series  |
| 1.3.0   | 2026-01-08 | Added governance drift detection and alerting workflow    |
| 1.4.0   | 2026-01-08 | Added governance policy validation and CI workflow        |
| 1.5.0   | 2026-01-08 | Added governance summary dashboard                        |
| 1.6.0   | 2026-01-08 | Added dashboard publishing workflow                       |
| 1.7.0   | 2026-01-08 | Added lockfile verification script and CI workflow        |
| 1.8.0   | 2026-01-08 | Added governance health checker and release pipeline gate |
| 1.9.0   | 2026-01-08 | Added governance audit log system                         |
| 1.10.0  | 2026-01-08 | Added comprehensive governance report generator           |
| 1.11.0  | 2026-01-08 | Added compliance checker and workflow audit logging       |

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
