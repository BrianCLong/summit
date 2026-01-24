# Release Operations Index

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

This document serves as the central index for all Release Operations tooling and documentation. The Release Ops system provides automated governance, monitoring, and remediation for the release lifecycle.

---

## Quick Reference

### Workflows at a Glance

| Workflow                                                                     | Schedule     | Trigger       | Purpose                       |
| ---------------------------------------------------------------------------- | ------------ | ------------- | ----------------------------- |
| [Release GA](../releases/TWO_PERSON_APPROVAL.md)                             | Manual       | Tag push      | GA promotion with approval    |
| [Hotfix Release](../releases/HOTFIX_OVERRIDE.md)                             | Manual       | Dispatch      | Emergency hotfix path         |
| [Blocker Escalation](BLOCKER_ESCALATION.md)                                  | Hourly       | `:15`         | Escalate aging blockers       |
| [Release Ops Digest](RELEASE_OPS_DIGEST.md)                                  | Daily        | `08:00 UTC`   | Consolidated status summary   |
| [On-Call Handoff](ONCALL_HANDOFF.md)                                         | 3x/day       | Shift change  | Shift transition notes        |
| [Auto-Triage](AUTO_TRIAGE_ROUTING.md)                                        | Event        | Issue labeled | Route blockers to teams       |
| [Auto-Remediation](AUTO_REMEDIATION.md)                                      | Event + 4h   | Issue labeled | Automated fixes               |
| [Release Train Dashboard](RELEASE_TRAIN_DASHBOARD.md)                        | 2-hourly     | Events        | Visual pipeline status        |
| [Test Quarantine](TEST_QUARANTINE.md)                                        | Event        | Test failure  | Quarantine flaky tests        |
| [Changelog Generator](CHANGELOG_GENERATOR.md)                                | Event        | Tag/release   | Generate release notes        |
| [Dependency Audit](DEPENDENCY_AUDIT.md)                                      | Daily        | `06:00 UTC`   | Security vulnerability scan   |
| [Type Safety Audit](TYPE_SAFETY_AUDIT.md)                                    | Daily        | `07:00 UTC`   | TypeScript any detection      |
| [API Determinism](API_DETERMINISM.md)                                        | Daily        | `08:00 UTC`   | Response consistency check    |
| [Pre-Release Health](PRE_RELEASE_HEALTH.md)                                  | On tag       | `05:00 UTC`   | Unified release gate          |
| [Evidence Collection](EVIDENCE_COLLECTION.md)                                | Daily        | `04:00 UTC`   | Capture compliance evidence   |
| [Stabilization Report](STABILIZATION_REPORT.md)                              | Daily        | `09:00 UTC`   | Progress tracking report      |
| [Dependency Freeze](DEPENDENCY_FREEZE.md)                                    | Event        | PR lockfile   | Prevent RC dep changes        |
| [Schema Compatibility](SCHEMA_COMPATIBILITY.md)                              | Event        | PR schema     | Prevent breaking API changes  |
| [Release Rollback](ROLLBACK_AUTOMATION.md)                                   | Manual       | Dispatch      | Safe GA rollback automation   |
| [Release RC Pipeline](RELEASE_RC_PIPELINE.md)                                | Event        | RC tag push   | Canonical RC tag workflow     |
| [Release GA Pipeline](RELEASE_GA_PIPELINE.md)                                | Event        | GA tag push   | Canonical GA tag workflow     |
| [Tag Verification](TAG_VERIFICATION.md)                                      | Manual       | Dispatch      | Verify green (manual only)    |
| [Promotion Bundle](PROMOTION_BUNDLE.md)                                      | Manual       | Dispatch      | Generate bundle (manual only) |
| [RC Preparation](RC_PREPARATION.md)                                          | Manual       | Dispatch/CLI  | Create stabilization RC tags  |
| [Postmortem Enforcer](../releases/HOTFIX_OVERRIDE.md)                        | Daily        | `09:00 UTC`   | Ensure hotfix postmortems     |
| [Release Policy Tests](REQUIRED_CHECKS.md#testing-policy-changes)            | Event        | Policy change | Tests for policy engine       |
| [Release Ops Orchestrator](RELEASE_OPS_ORCHESTRATOR.md)                      | Hourly       | Schedule      | Primary Release Ops cycle     |
| [Release Ops Pages](RELEASE_OPS_PAGES.md)                                    | Event        | Orchestrator  | Publish to GitHub Pages       |
| [Release Ops Internal](RELEASE_OPS_REDACTION.md#workflows)                   | Manual       | Dispatch      | Internal full package         |
| [Redaction Tests](RELEASE_OPS_REDACTION.md#ci-testing)                       | Event        | PR paths      | Test redaction layer          |
| [Redaction Trend Alerts](REDACTION_TREND_ALERTS.md)                          | Event        | Pages publish | Trend-based incident routing  |
| [Release Ops SLO Issue](RELEASE_OPS_SLO.md)                                  | Monthly      | 1st @ 09:00   | Monthly SLO summary issue     |
| [Error Budget Alerts](ERROR_BUDGET.md)                                       | Event        | Pages publish | Budget exhaustion alerting    |
| [Release Override](CHANGE_FREEZE_MODE.md)                                    | Manual       | Dispatch      | Temporary freeze override     |
| [Branch Protection Drift](BRANCH_PROTECTION_DRIFT.md)                        | Daily + PR   | 10:00 UTC     | Policy vs GitHub drift check  |
| [Branch Protection Reconcile](BRANCH_PROTECTION_RECONCILIATION.md)           | Manual       | Dispatch      | Generate reconciliation plans |
| [Required Checks Exceptions](REQUIRED_CHECKS_EXCEPTIONS.md)                  | PR + Push    | On change     | Validate exception file       |
| [Governance Drift Check](GOVERNANCE_LOCKFILE.md#governance-hash-correlation) | Daily + Push | 11:00 UTC     | Monitor policy drift          |
| [Governance Policy Validation](GOVERNANCE_LOCKFILE.md)                       | PR + Push    | On change     | Validate policy syntax        |
| [Governance Dashboard Publish](GOVERNANCE_LOCKFILE.md)                       | Daily + Push | 12:00 UTC     | Publish dashboard to Pages    |
| [Governance Lockfile Verify](GOVERNANCE_LOCKFILE.md)                         | PR + Push    | On change     | Verify lockfile integrity     |

---

## Feature Matrix

### Governance Features

| Feature                     | Status    | Documentation                                                                |
| --------------------------- | --------- | ---------------------------------------------------------------------------- |
| Two-Person Approval         | ✅ Active | [TWO_PERSON_APPROVAL.md](../releases/TWO_PERSON_APPROVAL.md)                 |
| Environment Gates           | ✅ Active | Requires `ga-release` environment                                            |
| Hotfix Override             | ✅ Active | [HOTFIX_OVERRIDE.md](../releases/HOTFIX_OVERRIDE.md)                         |
| Postmortem Enforcement      | ✅ Active | [HOTFIX_OVERRIDE.md](../releases/HOTFIX_OVERRIDE.md#postmortem-requirements) |
| Dependency Freeze           | ✅ Active | [DEPENDENCY_FREEZE.md](DEPENDENCY_FREEZE.md)                                 |
| Schema Compatibility        | ✅ Active | [SCHEMA_COMPATIBILITY.md](SCHEMA_COMPATIBILITY.md)                           |
| Rollback Automation         | ✅ Active | [ROLLBACK_AUTOMATION.md](ROLLBACK_AUTOMATION.md)                             |
| Release RC Pipeline         | ✅ Active | [RELEASE_RC_PIPELINE.md](RELEASE_RC_PIPELINE.md)                             |
| Release GA Pipeline         | ✅ Active | [RELEASE_GA_PIPELINE.md](RELEASE_GA_PIPELINE.md)                             |
| Tag Verification            | ✅ Active | [TAG_VERIFICATION.md](TAG_VERIFICATION.md) (manual only)                     |
| Promotion Bundle            | ✅ Active | [PROMOTION_BUNDLE.md](PROMOTION_BUNDLE.md) (manual only)                     |
| RC Preparation              | ✅ Active | [RC_PREPARATION.md](RC_PREPARATION.md)                                       |
| Change Freeze Mode          | ✅ Active | [CHANGE_FREEZE_MODE.md](CHANGE_FREEZE_MODE.md)                               |
| Branch Protection Drift     | ✅ Active | [BRANCH_PROTECTION_DRIFT.md](BRANCH_PROTECTION_DRIFT.md)                     |
| Branch Protection Reconcile | ✅ Active | [BRANCH_PROTECTION_RECONCILIATION.md](BRANCH_PROTECTION_RECONCILIATION.md)   |
| Required Checks Exceptions  | ✅ Active | [REQUIRED_CHECKS_EXCEPTIONS.md](REQUIRED_CHECKS_EXCEPTIONS.md)               |
| Governance Lockfile         | ✅ Active | [GOVERNANCE_LOCKFILE.md](GOVERNANCE_LOCKFILE.md)                             |
| Governance Hash Correlation | ✅ Active | Embedded in markers/SLO reports                                              |

### Monitoring Features

| Feature            | Status    | Documentation                                            |
| ------------------ | --------- | -------------------------------------------------------- |
| Blocker Escalation | ✅ Active | [BLOCKER_ESCALATION.md](BLOCKER_ESCALATION.md)           |
| Daily Digest       | ✅ Active | [RELEASE_OPS_DIGEST.md](RELEASE_OPS_DIGEST.md)           |
| On-Call Handoff    | ✅ Active | [ONCALL_HANDOFF.md](ONCALL_HANDOFF.md)                   |
| Release Dashboard  | ✅ Active | [RELEASE_TRAIN_DASHBOARD.md](RELEASE_TRAIN_DASHBOARD.md) |
| Trend Alerting     | ✅ Active | [REDACTION_TREND_ALERTS.md](REDACTION_TREND_ALERTS.md)   |
| SLO Reporting      | ✅ Active | [RELEASE_OPS_SLO.md](RELEASE_OPS_SLO.md)                 |
| Error Budget       | ✅ Active | [ERROR_BUDGET.md](ERROR_BUDGET.md)                       |

### Automation Features

| Feature             | Status    | Documentation                                    |
| ------------------- | --------- | ------------------------------------------------ |
| Auto-Triage Routing | ✅ Active | [AUTO_TRIAGE_ROUTING.md](AUTO_TRIAGE_ROUTING.md) |
| Auto-Remediation    | ✅ Active | [AUTO_REMEDIATION.md](AUTO_REMEDIATION.md)       |
| Test Quarantine     | ✅ Active | [TEST_QUARANTINE.md](TEST_QUARANTINE.md)         |
| Changelog Generator | ✅ Active | [CHANGELOG_GENERATOR.md](CHANGELOG_GENERATOR.md) |

### Audit Features

| Feature              | Status    | Documentation                                      |
| -------------------- | --------- | -------------------------------------------------- |
| Dependency Audit     | ✅ Active | [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md)         |
| Type Safety Audit    | ✅ Active | [TYPE_SAFETY_AUDIT.md](TYPE_SAFETY_AUDIT.md)       |
| API Determinism      | ✅ Active | [API_DETERMINISM.md](API_DETERMINISM.md)           |
| Pre-Release Health   | ✅ Active | [PRE_RELEASE_HEALTH.md](PRE_RELEASE_HEALTH.md)     |
| Evidence Collection  | ✅ Active | [EVIDENCE_COLLECTION.md](EVIDENCE_COLLECTION.md)   |
| Stabilization Report | ✅ Active | [STABILIZATION_REPORT.md](STABILIZATION_REPORT.md) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RELEASE OPS SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   INGEST    │    │   PROCESS   │    │   OUTPUT    │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                 │
│  │ Issue Events │    │ Auto-Triage │    │   Digest    │                 │
│  │ Label Events │    │ Escalation  │    │  Handoff    │                 │
│  │ Schedules   │    │ Remediation │    │  Comments   │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      STATE MANAGEMENT                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  blockers_state.json  │  digest_state.json  │  triage_state.json │   │
│  │  handoff_state.json   │  remediation_state.json │ dashboard_state │   │
│  │  quarantine_state.json │  changelog_state.json                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      POLICY CONFIGURATION                        │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  BLOCKER_ESCALATION_POLICY.yml  │  RELEASE_OPS_DIGEST_POLICY.yml │   │
│  │  ONCALL_HANDOFF_POLICY.yml      │  TRIAGE_ROUTING_POLICY.yml     │   │
│  │  REMEDIATION_PLAYBOOKS.yml      │  TEST_QUARANTINE_POLICY.yml    │   │
│  │  CHANGELOG_POLICY.yml                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Daily Operations

### Morning Routine (08:00-09:00 UTC)

1. **Review Daily Digest** - Check workflow artifacts for overnight summary
2. **Review Escalations** - Address any P0 blockers that escalated overnight
3. **Handoff Notes** - Review incoming handoff from previous shift

### Throughout the Day

1. **Monitor new blockers** - Auto-triage routes to teams
2. **Track escalations** - Hourly checks add escalation labels
3. **Review remediation** - Check if auto-remediation resolved issues

### Shift Handoff

1. **Generate handoff** - Automatic 30 min before shift change
2. **Add context** - Use `--context` flag for important notes
3. **Review incoming** - Check handoff note from outgoing shift

---

## Runbooks

### Creating a GA Release

1. Ensure all blockers resolved (no `release-blocker` labels)
2. Tag the release: `git tag v4.2.0`
3. Push tag: `git push origin v4.2.0`
4. Wait for `prepare-release` job to complete
5. Approve in `ga-release` environment
6. Monitor `publish` job

**Documentation:** [TWO_PERSON_APPROVAL.md](../releases/TWO_PERSON_APPROVAL.md)

### Emergency Hotfix

1. Navigate to Actions → Hotfix Release
2. Fill in required fields:
   - Version (e.g., `4.1.2-hotfix.1`)
   - Commit SHA
   - Justification (min 50 chars)
   - Incident ticket URL
   - Risk level
3. Approve in `hotfix-release` environment
4. Create postmortem within 48 hours

**Documentation:** [HOTFIX_OVERRIDE.md](../releases/HOTFIX_OVERRIDE.md)

### Handling a P0 Blocker

1. Issue gets `release-blocker` label
2. Auto-triage routes to team
3. Escalation timers start:
   - 1h: `escalation:warn`
   - 4h: `escalation:P0`
   - 8h: Page on-call
4. Auto-remediation may attempt fix
5. Appears in next digest

**Documentation:** [BLOCKER_ESCALATION.md](BLOCKER_ESCALATION.md)

### Investigating Flaky Tests

1. Issue labeled `flaky-test`
2. Auto-remediation attempts re-run with retries
3. If still failing, `quarantine-candidate` label added
4. Escalates to `needs-investigation`
5. Team reviews and fixes root cause

**Documentation:** [AUTO_REMEDIATION.md](AUTO_REMEDIATION.md#flaky-tests)

---

## Configuration Files

### Policy Files

| File                               | Purpose                      | Location   |
| ---------------------------------- | ---------------------------- | ---------- |
| `REQUIRED_CHECKS_POLICY.yml`       | Required CI checks           | `docs/ci/` |
| `BLOCKER_ESCALATION_POLICY.yml`    | Escalation thresholds        | `docs/ci/` |
| `RELEASE_OPS_DIGEST_POLICY.yml`    | Digest configuration         | `docs/ci/` |
| `ONCALL_HANDOFF_POLICY.yml`        | Shift schedules              | `docs/ci/` |
| `TRIAGE_ROUTING_POLICY.yml`        | Team routing rules           | `docs/ci/` |
| `REMEDIATION_PLAYBOOKS.yml`        | Playbook definitions         | `docs/ci/` |
| `TEST_QUARANTINE_POLICY.yml`       | Quarantine rules             | `docs/ci/` |
| `CHANGELOG_POLICY.yml`             | Changelog categories         | `docs/ci/` |
| `DEPENDENCY_AUDIT_POLICY.yml`      | Audit thresholds             | `docs/ci/` |
| `TYPE_SAFETY_POLICY.yml`           | Any type limits              | `docs/ci/` |
| `API_DETERMINISM_POLICY.yml`       | Endpoint checks              | `docs/ci/` |
| `REDACTION_POLICY.yml`             | Content redaction            | `docs/ci/` |
| `REDACTION_TREND_ALERT_POLICY.yml` | Trend alert thresholds       | `docs/ci/` |
| `RELEASE_OPS_SLO_POLICY.yml`       | SLO targets/windows          | `docs/ci/` |
| `ERROR_BUDGET_POLICY.yml`          | Budget allocations           | `docs/ci/` |
| `REQUIRED_CHECKS_EXCEPTIONS.yml`   | Branch protection exceptions | `docs/ci/` |

### State Files

| File                                 | Purpose               | Location                |
| ------------------------------------ | --------------------- | ----------------------- |
| `blockers_state.json`                | Escalation state      | `docs/releases/_state/` |
| `digest_state.json`                  | Digest deduplication  | `docs/releases/_state/` |
| `handoff_state.json`                 | Handoff context       | `docs/releases/_state/` |
| `triage_state.json`                  | Triage cooldowns      | `docs/releases/_state/` |
| `remediation_state.json`             | Remediation attempts  | `docs/releases/_state/` |
| `quarantine_state.json`              | Quarantine history    | `docs/releases/_state/` |
| `changelog_state.json`               | Generation history    | `docs/releases/_state/` |
| `dashboard_state.json`               | Dashboard snapshots   | `docs/releases/_state/` |
| `audit_state.json`                   | Dependency audit      | `docs/releases/_state/` |
| `type_safety_state.json`             | Type safety audit     | `docs/releases/_state/` |
| `determinism_state.json`             | API determinism       | `docs/releases/_state/` |
| `health_check_state.json`            | Pre-release health    | `docs/releases/_state/` |
| `evidence_state.json`                | Evidence collection   | `docs/releases/_state/` |
| `dependency_freeze_state.json`       | Dependency freeze     | `docs/releases/_state/` |
| `schema_compatibility_state.json`    | Schema compat         | `docs/releases/_state/` |
| `rollback_state.json`                | Rollback history      | `docs/releases/_state/` |
| `redaction_trend_alerts_state.json`  | Alert dedup state     | `docs/releases/_state/` |
| `slo_issues_state.json`              | Monthly SLO issues    | `docs/releases/_state/` |
| `error_budget_state.json`            | Budget tracking       | `docs/releases/_state/` |
| `error_budget_alerts_state.json`     | Budget alert dedup    | `docs/releases/_state/` |
| `governance_tight_mode.json`         | Tight mode flag       | `docs/releases/_state/` |
| `freeze_mode.json`                   | Change freeze flag    | `docs/releases/_state/` |
| `release_override.json`              | Override state        | `docs/releases/_state/` |
| `branch_protection_drift_state.json` | Drift detection state | `docs/releases/_state/` |

---

## Scripts

| Script                                      | Purpose                  | Usage                                                         |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------- |
| `escalate_release_blockers.sh`              | Apply escalation labels  | `./scripts/release/escalate_release_blockers.sh`              |
| `generate_release_ops_digest.sh`            | Generate daily digest    | `./scripts/release/generate_release_ops_digest.sh`            |
| `generate_oncall_handoff.sh`                | Generate handoff note    | `./scripts/release/generate_oncall_handoff.sh`                |
| `auto_triage_blockers.sh`                   | Route blockers to teams  | `./scripts/release/auto_triage_blockers.sh`                   |
| `run_remediation.sh`                        | Execute playbooks        | `./scripts/release/run_remediation.sh`                        |
| `generate_release_train_dashboard.sh`       | Generate dashboard       | `./scripts/release/generate_release_train_dashboard.sh`       |
| `manage_test_quarantine.sh`                 | Manage test quarantine   | `./scripts/release/manage_test_quarantine.sh`                 |
| `generate_changelog.sh`                     | Generate changelog       | `./scripts/release/generate_changelog.sh`                     |
| `dependency_audit.sh`                       | Dependency security      | `./scripts/release/dependency_audit.sh`                       |
| `type_safety_audit.sh`                      | Type safety check        | `./scripts/release/type_safety_audit.sh`                      |
| `api_determinism_check.sh`                  | API consistency          | `./scripts/release/api_determinism_check.sh`                  |
| `pre_release_health_check.sh`               | Unified health check     | `./scripts/release/pre_release_health_check.sh`               |
| `generate_evidence_bundle.sh`                       | Collect GA evidence      | `./scripts/release/generate_evidence_bundle.sh`                       |
| `generate_stabilization_report.sh`          | Progress report          | `./scripts/release/generate_stabilization_report.sh`          |
| `verify_dependency_freeze.sh`               | Verify dep freeze        | `./scripts/release/verify_dependency_freeze.sh`               |
| `check_schema_compatibility.sh`             | Check schema compat      | `./scripts/release/check_schema_compatibility.sh`             |
| `rollback_release.sh`                       | Rollback failed release  | `./scripts/release/rollback_release.sh`                       |
| `verify-green-for-tag.sh`                   | Verify green for tag     | `./scripts/release/verify-green-for-tag.sh`                   |
| `compute_base_for_commit.sh`                | Compute base reference   | `./scripts/release/compute_base_for_commit.sh`                |
| `should_run_task.sh`                        | Cadence-aware task gate  | `./scripts/release/should_run_task.sh --task <name>`          |
| `generate_release_ops_single_page.sh`       | Single page summary      | `./scripts/release/generate_release_ops_single_page.sh`       |
| `render_release_ops_single_page_html.sh`    | HTML renderer            | `./scripts/release/render_release_ops_single_page_html.sh`    |
| `generate_release_ops_bundle_index_html.sh` | Bundle index page        | `./scripts/release/generate_release_ops_bundle_index_html.sh` |
| `build_release_ops_site.sh`                 | Build Pages site         | `./scripts/release/build_release_ops_site.sh`                 |
| `redact_release_ops_content.sh`             | Redaction layer          | `./scripts/release/redact_release_ops_content.sh`             |
| `tests/redaction_layer.test.sh`             | Redaction layer tests    | `./scripts/release/tests/redaction_layer.test.sh`             |
| `compute_redaction_health.sh`               | Redaction health badge   | `./scripts/release/compute_redaction_health.sh`               |
| `build_redaction_triage_packet.sh`          | Redaction triage packet  | `./scripts/release/build_redaction_triage_packet.sh`          |
| `store_pages_snapshot.sh`                   | Pages snapshot storage   | `./scripts/release/store_pages_snapshot.sh`                   |
| `write_rollback_report.sh`                  | Rollback report writer   | `./scripts/release/write_rollback_report.sh`                  |
| `write_deployment_marker.sh`                | Deployment status marker | `./scripts/release/write_deployment_marker.sh`                |
| `update_redaction_metrics_timeseries.sh`    | Time series collector    | `./scripts/release/update_redaction_metrics_timeseries.sh`    |
| `render_redaction_metrics_trend.sh`         | Trend page renderer      | `./scripts/release/render_redaction_metrics_trend.sh`         |
| `check_redaction_trends.sh`                 | Trend alert checker      | `./scripts/release/check_redaction_trends.sh`                 |
| `compute_release_ops_slo.sh`                | SLO metrics computation  | `./scripts/release/compute_release_ops_slo.sh`                |
| `render_release_ops_slo_report.sh`          | SLO report renderer      | `./scripts/release/render_release_ops_slo_report.sh`          |
| `compute_error_budget.sh`                   | Error budget computation | `./scripts/release/compute_error_budget.sh`                   |
| `render_error_budget_panel.sh`              | Error budget renderer    | `./scripts/release/render_error_budget_panel.sh`              |
| `enforce_freeze_gate.sh`                    | Freeze mode gate         | `./scripts/release/enforce_freeze_gate.sh`                    |
| `extract_required_checks_from_policy.sh`    | Policy check extraction  | `./scripts/release/extract_required_checks_from_policy.sh`    |
| `check_branch_protection_drift.sh`          | Drift detection          | `./scripts/release/check_branch_protection_drift.sh`          |
| `reconcile_branch_protection.sh`            | Reconciliation planner   | `./scripts/release/reconcile_branch_protection.sh`            |
| `validate_required_checks_exceptions.sh`    | Exception validator      | `./scripts/release/validate_required_checks_exceptions.sh`    |
| `generate_governance_lockfile.sh`           | Governance lockfile gen  | `./scripts/release/generate_governance_lockfile.sh`           |
| `verify_release_bundle.sh`                  | Bundle verifier          | `./scripts/release/verify_release_bundle.sh`                  |
| `build-promotion-bundle.sh`                 | Build promotion bundle   | `./scripts/release/build-promotion-bundle.sh`                 |
| `prepare-stabilization-rc.sh`               | Prepare RC tag           | `./scripts/release/prepare-stabilization-rc.sh`               |
| `verify-rc-lineage.sh`                      | Verify GA→RC lineage     | `./scripts/release/verify-rc-lineage.sh`                      |
| `build-ga-bundle.sh`                        | Build GA release bundle  | `./scripts/release/build-ga-bundle.sh`                        |
| `publish_guard.sh`                          | Final publish guard      | `./scripts/release/publish_guard.sh`                          |
| `check_governance_drift.sh`                 | Governance drift check   | `./scripts/release/check_governance_drift.sh`                 |
| `validate_governance_policies.sh`           | Policy validation        | `./scripts/release/validate_governance_policies.sh`           |
| `render_governance_dashboard.sh`            | Governance dashboard     | `./scripts/release/render_governance_dashboard.sh`            |
| `verify_governance_lockfile.sh`             | Lockfile verification    | `./scripts/release/verify_governance_lockfile.sh`             |
| `compute_governance_health.sh`              | Governance health check  | `./scripts/release/compute_governance_health.sh`              |
| `update_governance_audit_log.sh`            | Audit log update         | `./scripts/release/update_governance_audit_log.sh`            |
| `query_governance_audit_log.sh`             | Audit log query          | `./scripts/release/query_governance_audit_log.sh`             |

### Common Flags

All scripts support these common flags:

| Flag        | Description                      |
| ----------- | -------------------------------- |
| `--dry-run` | Show actions without executing   |
| `--force`   | Bypass rate limits and cooldowns |
| `--help`    | Show usage information           |

---

## GitHub Environments

### `ga-release`

- **Purpose:** Gate GA promotions
- **Required reviewers:** 2 (from release team)
- **Wait timer:** None
- **Deployment branches:** `main`, `release/*`

### `hotfix-release`

- **Purpose:** Gate emergency hotfixes
- **Required reviewers:** 1 (from SRE team)
- **Wait timer:** None
- **Deployment branches:** Any

---

## Labels

### Severity Labels

| Label         | Meaning          | Escalation Timer      |
| ------------- | ---------------- | --------------------- |
| `severity:P0` | Critical blocker | 1h warn, 4h escalate  |
| `severity:P1` | High priority    | 4h warn, 12h escalate |
| `severity:P2` | Normal priority  | No escalation         |

### Escalation Labels

| Label             | Meaning                   |
| ----------------- | ------------------------- |
| `escalation:warn` | Warning threshold reached |
| `escalation:P0`   | Escalated to P0           |
| `escalation:P1`   | Escalated to P1           |

### Team Labels

| Label           | Routed To           |
| --------------- | ------------------- |
| `team:platform` | Platform team       |
| `team:security` | Security team       |
| `team:backend`  | Backend team        |
| `team:frontend` | Frontend team       |
| `team:release`  | Release engineering |

### Status Labels

| Label                  | Meaning                    |
| ---------------------- | -------------------------- |
| `release-blocker`      | Blocks release             |
| `needs-triage`         | Awaiting triage            |
| `needs-manual-triage`  | Auto-triage couldn't route |
| `needs-investigation`  | Requires human analysis    |
| `quarantine-candidate` | Flaky test to quarantine   |

---

## Metrics and Monitoring

### Key Metrics

| Metric              | Source              | Alert Threshold |
| ------------------- | ------------------- | --------------- |
| Open blockers       | Digest              | > 5             |
| P0 blockers         | Escalation          | > 0             |
| Blocker age         | Escalation          | > 24h           |
| Failed remediations | Remediation         | > 3 consecutive |
| Missing postmortems | Postmortem enforcer | > 0 after 48h   |

### Dashboards

- **CI Runs:** `https://github.com/{org}/{repo}/actions`
- **Open Blockers:** `https://github.com/{org}/{repo}/issues?q=label:release-blocker+is:open`
- **Escalations:** `https://github.com/{org}/{repo}/issues?q=label:escalation:P0+is:open`

---

## Troubleshooting

### Common Issues

#### Digest not generating

1. Check workflow run logs
2. Verify `GITHUB_TOKEN` permissions
3. Check rate limit state in `digest_state.json`
4. Use `--force` flag to bypass

#### Escalation labels not applied

1. Verify issue has `release-blocker` label
2. Check escalation policy thresholds
3. Review `blockers_state.json` for issue entry
4. Run escalation script manually with `--dry-run`

#### Auto-triage not routing

1. Verify trigger labels (`needs-triage` or `release-blocker`)
2. Check routing rules in policy
3. Review workflow logs
4. Run triage script with `--force`

#### Remediation not executing

1. Check if playbook matches (labels/keywords)
2. Verify attempt limits not reached
3. Check cooldown timer
4. Use `--dry-run` to test matching

---

## Support

### Getting Help

- **Documentation:** This index and linked documents
- **Issues:** Create issue with `release-ops` label
- **Slack:** `#release-engineering` channel

### Contributing

1. Policy changes: Edit YAML files, create PR
2. Script changes: Test with `--dry-run` first
3. New playbooks: Add to `REMEDIATION_PLAYBOOKS.yml`
4. Documentation: Update relevant `.md` files

---

## Change Log

| Date       | Change                                            | Author               |
| ---------- | ------------------------------------------------- | -------------------- |
| 2026-01-08 | Initial Release Ops Index                         | Platform Engineering |
| 2026-01-08 | Added all MVP-4 features                          | Platform Engineering |
| 2026-01-08 | Added Test Quarantine, Changelog Gen              | Platform Engineering |
| 2026-01-08 | Added Stabilization Audit features                | Platform Engineering |
| 2026-01-08 | Added Evidence Collection                         | Platform Engineering |
| 2026-01-08 | Added Stabilization Report                        | Platform Engineering |
| 2026-01-08 | Added Dependency Freeze                           | Platform Engineering |
| 2026-01-08 | Added Schema Compatibility                        | Platform Engineering |
| 2026-01-08 | Added Rollback Automation                         | Platform Engineering |
| 2026-01-08 | Added Tag Verification                            | Platform Engineering |
| 2026-01-08 | Added Promotion Bundle                            | Platform Engineering |
| 2026-01-08 | Added RC Preparation                              | Platform Engineering |
| 2026-01-08 | Added RC Preparation workflow                     | Platform Engineering |
| 2026-01-08 | Added Release RC Pipeline                         | Platform Engineering |
| 2026-01-08 | Added Release GA Pipeline                         | Platform Engineering |
| 2026-01-08 | Added Release Policy Tests                        | Platform Engineering |
| 2026-01-08 | Updated to policy-driven dashboard                | Platform Engineering |
| 2026-01-08 | Added Release Ops Orchestrator                    | Platform Engineering |
| 2026-01-08 | Added cadence-aware execution                     | Platform Engineering |
| 2026-01-08 | Added single page summary generator               | Platform Engineering |
| 2026-01-08 | Added static HTML rendering                       | Platform Engineering |
| 2026-01-08 | Added bundle index landing page                   | Platform Engineering |
| 2026-01-08 | Added GitHub Pages publishing                     | Platform Engineering |
| 2026-01-08 | Added redaction layer and dual-mode               | Platform Engineering |
| 2026-01-08 | Added redaction layer CI tests                    | Platform Engineering |
| 2026-01-08 | Added redaction health badge                      | Platform Engineering |
| 2026-01-08 | Added redaction triage packet                     | Platform Engineering |
| 2026-01-08 | Added automatic Pages rollback                    | Platform Engineering |
| 2026-01-08 | Added deployment status marker                    | Platform Engineering |
| 2026-01-08 | Added redaction metrics time series               | Platform Engineering |
| 2026-01-08 | Added trend-based alerting system                 | Platform Engineering |
| 2026-01-08 | Added SLO reporting and monthly issue             | Platform Engineering |
| 2026-01-08 | Added error budget and tight mode                 | Platform Engineering |
| 2026-01-08 | Added change freeze mode and override             | Platform Engineering |
| 2026-01-08 | Added branch protection drift detection           | Platform Engineering |
| 2026-01-08 | Added branch protection reconciliation            | Platform Engineering |
| 2026-01-08 | Added required checks exception management        | Platform Engineering |
| 2026-01-08 | Added governance lockfile and bundle verification | Platform Engineering |
| 2026-01-08 | Added governance hash correlation to markers/SLO  | Platform Engineering |
| 2026-01-08 | Added governance drift detection and alerting     | Platform Engineering |
| 2026-01-08 | Added governance policy validation workflow       | Platform Engineering |
| 2026-01-08 | Added governance summary dashboard                | Platform Engineering |
| 2026-01-08 | Added governance dashboard publishing workflow    | Platform Engineering |
| 2026-01-08 | Added lockfile verification script and workflow   | Platform Engineering |
| 2026-01-08 | Added governance health checker and release gate  | Platform Engineering |
| 2026-01-08 | Added governance audit log system                 | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
