# Dependency Vulnerability Management

## Overview

This project uses automated tools to manage dependency vulnerabilities. We enforce a policy of **zero critical/high vulnerabilities** in our production dependencies.

## Automated Scanning

### CI/CD Pipeline
- **npm audit**: Runs on every Pull Request and Push to main. Fails if any Critical or High vulnerabilities are found.
- **Dependency Review**: GitHub's Dependency Review Action runs on PRs to highlight new vulnerabilities introduced by dependency changes.

## Upgrade Process

When a vulnerability is detected:

1.  **Identify**: Run `pnpm audit` locally to see details.
    ```bash
    pnpm audit
    ```

2.  **Fix Automatic**: Try running the auto-fix command.
    ```bash
    pnpm audit --fix
    ```

3.  **Manual Upgrade**: If auto-fix fails, identify the parent package and upgrade it.
    ```bash
    pnpm update <package_name>
    ```

4.  **Overrides/Resolutions**: If a nested dependency cannot be upgraded (e.g., waiting on upstream), use `pnpm.overrides` (or `resolutions` in package.json) to force a secure version.
    ```json
    "pnpm": {
      "overrides": {
        "vulnerable-package": "^1.2.3"
      }
    }
    ```

5.  **Verify**: Run `pnpm audit` again to ensure the vulnerability is resolved.

## Exception Process

If a vulnerability cannot be resolved and is determined to be a false positive or not applicable (e.g., dev-only tool with no production impact), it can be documented here or suppressed via audit configurations, but this should be a last resort.
