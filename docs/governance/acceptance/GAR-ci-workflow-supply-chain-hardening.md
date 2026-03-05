# Governance Acceptance Record: Workflow Supply Chain Hardening

## Decision Summary
- Decision: Enforce least-privilege `permissions` and pin GitHub Actions to immutable SHAs.
- PR: https://github.com/BrianCLong/summit/pull/18842
- Scope: `.github/workflows/*.yml` permissions blocks and action references.
- Primary outcome: Hardened CI supply chain against compromised third-party actions and prevented over-privileged workflow execution.

## Problem Statement
- Symptoms: Workflows executing with default read/write permissions and referencing mutable action tags (e.g., `@v3`).
- Impact: Significant supply chain vulnerability; a compromised action could alter repository code or exfiltrate secrets.
- Root cause (as evidenced): Legacy workflow definitions lacked explicit `permissions` blocks and relied on tag-based versioning.

## Options Considered
1) Option A: Use a third-party security scanner without modifying workflows. (Rejected: Does not proactively prevent execution of malicious payloads).
2) Option B: Build internal forks of all actions. (Rejected: High maintenance burden).
3) Chosen option and rationale: Pin all external actions to full commit SHAs and explicitly declare least-privilege `permissions` at the workflow and job levels.

## Changes Introduced
- Files changed: `.github/workflows/*.yml`
- Behavior changes: Actions are now referenced by SHA (e.g., `actions/checkout@<sha> # v4`). Explicit `permissions: contents: read` added globally, with write permissions granted strictly on a per-job basis where required.
- Governance gates preserved: All CI gates execute identically but under restricted isolation.
- Security changes: Drastically reduced token attack surface and eliminated mutable tag risks.

## Evidence
### Before
- EVID-SEC-001: Workflows lacked explicit permissions.
  - Reproduce: `grep "permissions:" .github/workflows/legacy.yml`
  - Expected: No output or `permissions: write-all`.
- EVID-SEC-002: Mutable tags in use.
  - Reproduce: `grep "uses: " .github/workflows/*.yml | grep "@v"`
  - Expected: Numerous hits for `@v2`, `@v3`, etc.

### After
- EVID-SEC-003: All workflows explicitly define least-privilege permissions.
  - Reproduce: `grep -A 3 "permissions:" .github/workflows/*.yml`
  - Expected: Explicit blocks (e.g., `contents: read`).
- EVID-SEC-004: All external actions are pinned by SHA.
  - Reproduce: `grep "uses: " .github/workflows/*.yml | grep -v "@v" | grep "@[0-9a-f]\{40\}"`
  - Expected: All third-party actions match the 40-character SHA pattern.

## Risk Assessment
- Risks: Hardcoded SHAs require manual updates for bug fixes/features.
- Mitigations: Integrated Dependabot or Renovate to automatically propose PRs for action SHA updates.
- Residual risk: Low. The security benefit heavily outweighs the update overhead.

## Rollback Plan
- Rollback trigger: A pinned SHA is deleted by the upstream author, breaking CI.
- Steps: Identify the broken action, locate a safe replacement SHA or tag, and submit a hotfix PR updating the `uses:` reference.
- Post-rollback verification: Confirm the workflow executes successfully with the new reference.

## Verification Capsule
Run these checks to re-validate this GAR at any time:
1) Confirm explicit permissions: `grep -q "permissions:" .github/workflows/ci-core.yml`
2) Confirm SHA pinning: `grep -E "uses:.*@[a-f0-9]{40}" .github/workflows/ci-core.yml`
3) Verify security scan action passes: `gh run list --workflow=security-scan`

## Approval / Sign-off
- Required approvers: Security Team
- Status: APPROVED
