# Branch Protection Policy (Policy-as-Code)

**Status:** Active
**Owner:** Platform Engineering
**Last Updated:** 2026-01-13

---

## Purpose

This policy enforces GitHub branch protection required status checks on `main` using a
single policy source: `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

The enforcement pipeline provides:

- Deterministic, read-only drift detection in CI.
- Admin-only remediation via `gh api` with explicit safety guards.
- Evidence artifacts for GA audit trails.

---

## Policy File

Source of truth: `docs/ci/REQUIRED_CHECKS_POLICY.yml`

Required fields used by the drift checker:

- `branch_protection.branch`
- `branch_protection.required_status_checks.strict`
- `branch_protection.required_status_checks.contexts`

---

## Local Usage

### Drift check (read-only)

```bash
pnpm ci:branch-protection:check -- --repo OWNER/REPO --branch main
```

Artifacts are written to:

```
artifacts/governance/branch-protection-drift/
  drift.json
  drift.md
  stamp.json
```

### Plan remediation (dry-run)

```bash
pnpm ci:branch-protection:plan -- --repo OWNER/REPO --branch main
```

### Apply remediation (admin-only)

```bash
ALLOW_BRANCH_PROTECTION_CHANGES=1 pnpm ci:branch-protection:apply -- --repo OWNER/REPO --branch main
```

### Generate ruleset payload (GitHub Rulesets)

Generate a ruleset payload aligned to the required checks policy and standard review rules:

```bash
node scripts/ci/generate_ruleset_payload.mjs \
  --policy docs/ci/REQUIRED_CHECKS_POLICY.yml \
  --name "Summit Main Branch Protection" \
  --output artifacts/governance/main-ruleset.json
```

Apply via GitHub API (admin token required):

```bash
gh api repos/OWNER/REPO/rulesets \
  --method POST \
  --input artifacts/governance/main-ruleset.json
```

The payload is deterministic and derives required check contexts from
`docs/ci/REQUIRED_CHECKS_POLICY.yml`.

### Generate branch protection payload (GitHub API)

Generate a branch protection payload aligned to required checks and review rules:

```bash
node scripts/ci/generate_branch_protection_payload.mjs \
  --policy docs/ci/REQUIRED_CHECKS_POLICY.yml \
  --output artifacts/governance/main-branch-protection.json
```

Apply via GitHub API (admin token required):

```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --input artifacts/governance/main-branch-protection.json
```

---

## Required Token Scopes

The apply workflow requires an authenticated `gh` CLI session with:

- Classic PAT: `repo` scope (admin on the repository)
- Fine-grained PAT: Repository permissions with **Administration: read/write** and
  **Contents: read**

---

## CI Enforcement

CI runs the drift checker as a required gate:

- Workflow: `ci-core.yml`
- Job name: `Governance / Branch Protection Drift`
- Mode: read-only

If drift is detected, the job fails and uploads evidence artifacts.

---

## Evidence Mapping

The checker emits:

- `drift.json`: machine-readable diff (policy vs GitHub)
- `drift.md`: human-readable summary and remediation command
- `stamp.json`: timestamp, repo, branch, status, hashes

These artifacts are attached to the CI run and stored under
`artifacts/governance/branch-protection-drift`.

---

## References

- Policy source: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- Checker: `scripts/ci/check_branch_protection_drift.mjs`
- Apply script: `scripts/ci/apply_branch_protection_policy.mjs`
- CI workflow: `.github/workflows/ci-core.yml`
