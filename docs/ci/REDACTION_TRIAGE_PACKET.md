# Redaction Triage Packet

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

When the Redaction Health Check reports **WARN** or **FAIL**, the Pages publish workflow automatically generates a **Triage Packet**. This packet contains everything needed to diagnose and remediate redaction issues quickly.

The packet is uploaded as a workflow artifact (internal only) and is **never published to GitHub Pages**.

---

## When Is It Generated?

| Health Level | Packet Generated? | Publication Blocked?        |
| ------------ | ----------------- | --------------------------- |
| OK           | No                | No                          |
| WARN         | Yes               | No (but review recommended) |
| FAIL         | Yes               | Yes (hard block)            |

---

## Packet Contents

A triage packet contains:

```
redaction-triage-{run_id}/
├── manifest.json              # Packet metadata
├── remediation_checklist.md   # Step-by-step remediation guide
├── run_tests.sh               # Quick test runner script
├── reports/                   # Collected reports
│   ├── redaction_health.json
│   ├── redaction_alert_report.json
│   ├── redaction_alert_report.md
│   ├── redaction_diff_report.json
│   ├── redaction_diff_report.md
│   └── dashboard_summary.json
├── policies/                  # Policy snapshots
│   ├── REDACTION_POLICY.yml
│   ├── REDACTION_ALERT_POLICY.yml
│   └── PAGES_PUBLISH_ALLOWLIST.md
└── diffs/                     # Recent policy changes
    ├── redaction_policy.diff
    ├── redaction_script.diff
    └── allowlist.diff
```

### manifest.json

Metadata about the triage packet:

```json
{
  "version": "1.0",
  "type": "redaction_triage_packet",
  "generated_at": "2026-01-08T12:34:56Z",
  "run_id": 20806007405,
  "git_sha": "abc123...",
  "contents": ["manifest.json", "remediation_checklist.md", "reports/", "policies/", "diffs/"]
}
```

### remediation_checklist.md

A step-by-step checklist for diagnosing and fixing the issue:

1. Confirm the issue (which threshold fired)
2. Run local tests
3. Check recent changes
4. Identify root cause
5. Apply fix
6. Re-deploy

### run_tests.sh

A helper script to run redaction tests locally:

```bash
cd /path/to/triage-packet
./run_tests.sh
```

---

## Downloading the Packet

### From GitHub Actions UI

1. Go to the failed/warned Pages publish workflow run
2. Scroll to "Artifacts" section
3. Download `redaction-triage-{run_id}`

### Using GitHub CLI

```bash
# Find the run ID
gh run list --workflow=publish-release-ops-pages.yml --limit 5

# Download the artifact
gh run download {RUN_ID} --name redaction-triage-{ARTIFACT_RUN_ID}
```

---

## Using the Packet

### Step 1: Extract and Review

```bash
# Extract if compressed
tar -xzf redaction-triage-*.tar.gz

# Open remediation checklist
cat redaction-triage-*/remediation_checklist.md
```

### Step 2: Check Reports

```bash
# View health status
cat reports/redaction_health.json | jq .

# Check specific triggers
cat reports/redaction_alert_report.json | jq '.triggers'
```

### Step 3: Review Recent Changes

```bash
# Check if policy changed recently
cat diffs/redaction_policy.diff

# Check if script changed
cat diffs/redaction_script.diff
```

### Step 4: Run Local Tests

```bash
# From triage packet directory
./run_tests.sh

# Or from repo root
./scripts/release/tests/redaction_layer.test.sh --verbose
```

### Step 5: Fix and Re-run

After identifying and fixing the issue:

```bash
# Run local tests to verify
./scripts/release/tests/redaction_layer.test.sh --verbose

# Push fix
git add . && git commit -m "fix(redaction): ..."
git push

# Re-run orchestrator (triggers Pages publish)
gh workflow run release-ops-orchestrator.yml
```

---

## Generating Manually

The triage packet can be generated manually for debugging:

```bash
# Generate packet for a specific run
./scripts/release/build_redaction_triage_packet.sh \
  --run-id 20806007405 \
  --site-dir site/release-ops \
  --out-dir artifacts/triage \
  --verbose

# Generate with custom policies
./scripts/release/build_redaction_triage_packet.sh \
  --run-id 12345 \
  --policy docs/ci/REDACTION_POLICY.yml \
  --alert-policy docs/ci/REDACTION_ALERT_POLICY.yml
```

### Command Options

| Option           | Description            | Default                                      |
| ---------------- | ---------------------- | -------------------------------------------- |
| `--run-id`       | GitHub workflow run ID | -                                            |
| `--site-dir`     | Built site directory   | `site/release-ops`                           |
| `--out-dir`      | Output directory       | `artifacts/redaction-triage/{date}-{run_id}` |
| `--policy`       | Redaction policy file  | `docs/ci/REDACTION_POLICY.yml`               |
| `--alert-policy` | Alert policy file      | `docs/ci/REDACTION_ALERT_POLICY.yml`         |
| `--verbose`      | Enable verbose logging | false                                        |

---

## Retention

Triage packet artifacts are retained for **30 days** by default. For longer retention:

1. Download the artifact before expiration
2. Attach to a GitHub issue for permanent storage
3. Or upload to team shared storage

---

## Escalation

If you cannot resolve the issue using the triage packet:

1. Create a GitHub issue with label `redaction-alert`
2. Attach the triage packet (or link to the workflow artifact)
3. Tag `@platform-team` for assistance
4. Include:
   - Summary of what you tried
   - Which threshold is firing
   - Any patterns you noticed

---

## References

- **Triage Script**: `scripts/release/build_redaction_triage_packet.sh`
- **Health Badge**: `docs/ci/REDACTION_HEALTH.md`
- **Redaction Policy**: `docs/ci/REDACTION_POLICY.yml`
- **Redaction Documentation**: `docs/ci/RELEASE_OPS_REDACTION.md`
- **Pages Workflow**: `.github/workflows/publish-release-ops-pages.yml`

---

## Change History

| Version | Date       | Changes                              |
| ------- | ---------- | ------------------------------------ |
| 1.0.0   | 2026-01-08 | Initial triage packet implementation |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
