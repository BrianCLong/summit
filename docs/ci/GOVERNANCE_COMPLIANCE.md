# Governance Compliance

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

The Governance Compliance system provides automated verification that all governance requirements are met before releases can proceed. It aggregates checks across policies, lockfiles, state flags, and health metrics to provide a single compliance score.

### What COMPLIANT Means

A **COMPLIANT** status indicates:

- All required policy files exist and are valid
- Policy syntax validation passes (YAML/JSON)
- Governance lockfile is present and verified
- Required state files exist with correct schema
- Overall governance health is OK or WARNING (not CRITICAL)
- Compliance score is >= 90%

### What NON_COMPLIANT Means

A **NON_COMPLIANT** status indicates one or more of:

- Missing required policy files
- Invalid policy syntax
- Missing or invalid governance lockfile
- Critical governance health issues
- Compliance score < 70%

---

## Running Compliance Checks

### Basic Check

```bash
# Run compliance check (human-readable output)
./scripts/release/check_governance_compliance.sh

# Example output:
# Status: COMPLIANT
# Score:  100%
```

### JSON Output for CI

```bash
# JSON output for automation
./scripts/release/check_governance_compliance.sh --json

# Example output:
# {
#   "compliance": {
#     "status": "COMPLIANT",
#     "score": 100
#   }
# }
```

### Strict Mode

```bash
# Strict mode treats warnings as failures
./scripts/release/check_governance_compliance.sh --strict
```

### Options

| Option                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `--strict`              | Treat warnings as failures                  |
| `--require-lockfile`    | Require governance lockfile (default: true) |
| `--no-require-lockfile` | Don't require governance lockfile           |
| `--max-age DAYS`        | Maximum lockfile age in days (default: 7)   |
| `--json`                | Output results as JSON                      |
| `--verbose`             | Enable verbose logging                      |

---

## Compliance Components

### 1. Required Policies (25% weight)

These policy files MUST exist:

| Policy          | Path                                 |
| --------------- | ------------------------------------ |
| Required Checks | `docs/ci/REQUIRED_CHECKS_POLICY.yml` |
| Error Budget    | `docs/ci/ERROR_BUDGET_POLICY.yml`    |

### 2. Policy Syntax Validation (25% weight)

All YAML and JSON files in the governance directories are validated for:

- Valid YAML/JSON syntax
- Required fields present
- Correct data types

### 3. Governance Lockfile (25% weight)

The lockfile provides audit-grade traceability:

- Must exist at `docs/releases/_state/governance_lockfile.json`
- Must be valid JSON
- Must be within max age (default: 7 days)
- Checksums must verify

### 4. Governance Health (25% weight)

Aggregated health from multiple sources:

- Policy validation status
- Lockfile integrity
- State flags (freeze mode, overrides)
- Drift detection

---

## Common Remediation Steps

### Missing Governance Lockfile

```bash
# Generate lockfile for current commit
./scripts/release/generate_governance_lockfile.sh \
  --sha $(git rev-parse HEAD) \
  --out-dir docs/releases/_state
```

### Policy Validation Failures

```bash
# Check which policies are failing
./scripts/release/validate_governance_policies.sh --verbose

# Common fixes:
# - Fix YAML syntax errors (indentation, special characters)
# - Add missing required fields
# - Ensure JSON files are valid
```

### Stale Lockfile

```bash
# Regenerate lockfile
./scripts/release/generate_governance_lockfile.sh \
  --sha $(git rev-parse HEAD) \
  --out-dir docs/releases/_state
```

### Critical Governance Health

```bash
# Check governance health details
./scripts/release/compute_governance_health.sh --verbose

# Common causes:
# - Policy validation failures -> fix policies
# - Missing lockfile -> generate lockfile
# - Freeze mode active -> requires manual intervention
```

---

## Integration with Pipelines

### Release Pipeline Gate

The compliance checker is integrated into release pipelines via the governance gate:

```yaml
# In release workflow
governance-gate:
  uses: ./.github/workflows/_reusable-governance-gate.yml
  with:
    require_lockfile: true
    strict_mode: true
    fail_on_critical: true
```

### GA Bundle Requirements

GA bundles MUST include:

- `governance/governance_lockfile.json`
- `governance/governance_SHA256SUMS`
- `governance/snapshot/` (copies of policy files)

### Automated Checks

| Workflow                         | Trigger                | Purpose                     |
| -------------------------------- | ---------------------- | --------------------------- |
| governance-policy-validation.yml | Policy file changes    | Validates policy syntax     |
| governance-lockfile-verify.yml   | Lockfile changes       | Verifies lockfile integrity |
| governance-drift-check.yml       | Daily + policy changes | Detects policy drift        |

---

## Scoring Algorithm

The compliance score is calculated as a weighted average:

```
Score = (
  Required Policies × 25% +
  Policy Syntax × 25% +
  Lockfile Status × 25% +
  Governance Health × 25%
) / 100
```

### Score Thresholds

| Score  | Status              |
| ------ | ------------------- |
| >= 90% | COMPLIANT           |
| 70-89% | PARTIALLY_COMPLIANT |
| < 70%  | NON_COMPLIANT       |

### Hard Failures

Regardless of score, the following cause NON_COMPLIANT:

- Any required policy is missing
- Lockfile is required but missing (when `--require-lockfile` is set)

---

## Audit Trail

All compliance checks are logged to the governance audit log:

```bash
# View recent audit entries
./scripts/release/query_governance_audit_log.sh --limit 20

# View compliance-related events
./scripts/release/query_governance_audit_log.sh --event-type gate

# View failures only
./scripts/release/query_governance_audit_log.sh --status failure
```

---

## Troubleshooting

### "PARTIALLY_COMPLIANT" Status

**Cause:** Score is between 70-89%

**Resolution:**

1. Run `--verbose` to see which checks are failing
2. Address warnings/failures shown
3. Re-run until COMPLIANT

### "Missing required policy"

**Cause:** A required policy file doesn't exist

**Resolution:**

1. Check if the file was accidentally deleted
2. Restore from git history or create the policy
3. Required policies: `REQUIRED_CHECKS_POLICY.yml`, `ERROR_BUDGET_POLICY.yml`

### "Lockfile verification failed"

**Cause:** Lockfile exists but failed integrity checks

**Resolution:**

1. Run `./scripts/release/verify_governance_lockfile.sh --verbose`
2. Check for:
   - Corrupted files
   - SHA mismatch
   - Age exceeded
3. Regenerate if needed

### "Governance health CRITICAL"

**Cause:** Multiple component failures

**Resolution:**

1. Run `./scripts/release/compute_governance_health.sh --verbose`
2. Address each failing component
3. Most common: policy validation failures + missing lockfile

---

## References

- **Compliance Checker:** `scripts/release/check_governance_compliance.sh`
- **Policy Validator:** `scripts/release/validate_governance_policies.sh`
- **Lockfile Generator:** `scripts/release/generate_governance_lockfile.sh`
- **Lockfile Verifier:** `scripts/release/verify_governance_lockfile.sh`
- **Health Checker:** `scripts/release/compute_governance_health.sh`
- **Audit Log Query:** `scripts/release/query_governance_audit_log.sh`
- **Governance Gate:** `.github/workflows/_reusable-governance-gate.yml`
- **Main Documentation:** `docs/ci/GOVERNANCE_LOCKFILE.md`

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
