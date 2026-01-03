# Dependency Hygiene & Security Evidence

**Owner**: Security Directorate
**Related Scripts**: `scripts/security/`

This document outlines the process for maintaining a secure and verifiable dependency supply chain in the Summit monorepo.

## Core Principles

1.  **Evidence-First**: No dependency change (add/update/remove) happens without auto-generated evidence.
2.  **Zero Drift**: The state of `package.json` and `pnpm-lock.yaml` must match the latest evidence pack.
3.  **Active Management**: We use `overrides` in `package.json` to pin transitive dependencies with known high-severity CVEs when patches are not yet available upstream.

## Workflows

### 1. Routine Updates & Remediation

When you need to update dependencies or fix a vulnerability:

1.  **Audit**: Run `pnpm audit` to identify risks.
2.  **Fix**:
    - Prefer `pnpm update <pkg>` for direct dependencies.
    - Use `overrides` in root `package.json` for transitive vulnerabilities (documenting the CVE).
3.  **Evidence**: Run the evidence generator to snapshot the new state.
    ```bash
    pnpm security:deps-report
    ```
4.  **Commit**: Commit the changes to `package.json`/`pnpm-lock.yaml` AND the new `evidence/deps/<timestamp>` folder.

### 2. CI/CD Integration

The **Drift Check** runs in CI to ensure that no one changed dependencies without generating evidence.

```bash
# Fails if package.json/lockfile hash doesn't match the latest evidence report
pnpm security:deps-drift-check
```

## Tooling

- **`pnpm security:deps-report`**: Runs `audit`, `outdated`, and hashes the lockfiles. Saves output to `evidence/deps/`.
- **`pnpm security:deps-drift-check`**: Validates integrity.
- **`pnpm security:dup-deps-check`**: Identifies version fragmentation across workspaces.

## CI/CD Integration Note

### GitHub Actions Wiring

To enforce these checks in CI, add the following step to your PR validation workflow:

```yaml
- name: Dependency Guard
  run: |
    pnpm security:deps-drift-check
    pnpm security:dup-deps-check
```

## Maintenance Patterns

### 1. Phasing out Deprecated Packages

Prefer removing placeholder packages like `crypto` (redundant in Node 18+) and migrating `request` usages to `axios` or `fetch`.

### 2. Lockfile Hygiene

Ensure `semantic-release` is configured to track `pnpm-lock.yaml` (not `package-lock.json`). This ensures the release environment matches development exactly.

## Handling False Positives

If `pnpm audit` reports a false positive or a risk we accept:

1.  Do NOT ignore it implicitly.
2.  Use `pnpm audit --audit-level=high` if we agree to tolerate moderate issues, OR
3.  Document the accepted risk in `docs/security/RISK_ACCEPTANCE.md` (if it exists) or in the PR description.
