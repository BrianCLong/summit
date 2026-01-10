# Trust Dashboard Specification

**Version:** 1.0
**Owner:** Codex / Ops
**Status:** ACTIVE

## Overview

The Trust Dashboard is a repo-local executable signal that provides a deterministic "Trust Posture" report. It runs in <30 seconds, uses no external services, and acts as a hard gate in CI.

## Signals

### Hard Gates (FAIL = Non-zero Exit)

| ID | Name | Check Logic | Failure Condition |
|----|------|-------------|-------------------|
| HG-01 | **Clean Working Tree** | `git status --porcelain` | Output is not empty |
| HG-02 | **No Untracked Files** | `git ls-files --others --exclude-standard` | Output is not empty |
| HG-03 | **GA Baseline Declared** | Check existence of `docs/ga/ga-declaration.md` and grep for "General Availability" | File missing or string not found |
| HG-04 | **Evidence Map Integrity** | Parse `docs/ga/MVP4_GA_EVIDENCE_MAP.md` table | File missing or rows missing "Command" column |
| HG-05 | **Security Ledger Clean** | Parse `docs/security/SECURITY-ISSUE-LEDGER.md` for `CRITICAL` or `HIGH` sections containing `OPEN` status | Open critical/high issues found |

### Soft Signals (WARN = Zero Exit)

| ID | Name | Check Logic | Warning Condition |
|----|------|-------------|-------------------|
| SS-01 | **Deferred Risks** | Check `docs/risk/RISK_REGISTER.md` or similar | File exists (informational) |
| SS-02 | **Integrity Budgets** | Check `scripts/ci/check_debt_regression.cjs` | Script missing |
| SS-03 | **Extension Guardrail** | Check `scripts/ga/check-pr-metadata.mjs` | Script missing |
| SS-04 | **Logging Safety** | Check `scripts/ga/scan-pii.mjs` | Script missing |
| SS-05 | **IR Runbook** | Check `docs/ops/INCIDENT_RESPONSE.md` | File missing |

## Usage

```bash
# Hard mode (CI gate)
node scripts/ops/generate_trust_dashboard.mjs --mode=hard

# Report mode (Informational)
node scripts/ops/generate_trust_dashboard.mjs --mode=report
```

## Output Format

Markdown table printed to stdout.
Header includes: Repo, Branch, Commit, Timestamp.
Columns: Signal, Status (PASS/WARN/FAIL), Detail, How to Fix.

## Integration

- **CI**: Integrated into release and PR gates where safe.
- **Local**: Developers run before push to verify trust posture.
