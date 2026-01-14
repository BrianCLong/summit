# Secrets Hygiene + Redaction Gate Runbook

## Purpose

This runbook defines how the Secrets Hygiene + Redaction Gate operates, how to run it locally, and how to remediate findings without exposing sensitive data. The gate scans tracked repository files and generated artifacts for high-risk secret patterns and produces audit-ready evidence bundles.

## What Is Scanned

- **Repo (tracked files only)** via `git ls-files`
- **Artifacts** under `artifacts/**` (e.g., evidence bundles)
- Common configuration and source formats (all text files under the include globs)
- Binary files are skipped using a NUL-byte heuristic
- Files larger than the configured size limit are skipped

The policy is defined in `docs/security/SECRETS_SCAN_POLICY.yml` and controls include/exclude globs, maximum file size, secret patterns, and allowlist behavior.

## How to Run Locally

From the repo root:

```bash
pnpm ci:secrets-scan
```

Optional modes:

```bash
pnpm ci:secrets-scan -- --mode repo
pnpm ci:secrets-scan -- --mode artifacts
```

Outputs are written to:

```
artifacts/governance/secrets-scan/<git-sha>/{report.json,report.md,stamp.json}
```

## Remediation Workflow

1. **Remove and rotate** any discovered secret material.
2. **Re-run** the scan to confirm zero blocking findings.
3. If the match is a false positive:
   - Add an allowlist entry with **expiry** and **rationale**.
   - Store only the SHA-256 of the matched string (never the raw match).

## Allowlist Entry Requirements

Allowlist entries must include:

- `id`
- `rule_id`
- `path` (glob)
- `match_hash` (sha256 of the exact matched string)
- `expires` (YYYY-MM-DD)
- `rationale`

Expired allowlist entries **do not suppress findings** and will cause the gate to fail.

### Generate a `match_hash`

Use a secure local shell and avoid recording secrets in shell history:

```bash
printf '%s' "<exact-match>" | sha256sum | awk '{print $1}'
```

## Understanding the Outputs

- **report.json**: deterministic, machine-readable results and metadata.
- **report.md**: human-readable summary with redacted previews.
- **stamp.json**: integrity stamp with hashes and timestamps.

The scanner never prints raw secrets. It emits only redacted previews and SHA-256 hashes for audit tracking.
