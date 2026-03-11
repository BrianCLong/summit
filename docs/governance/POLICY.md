# CI Guardrails and Policy Hooks

This document outlines the governance rules and policy hooks enforced in the Summit CI pipeline.
These guardrails ensure code quality, security, and compliance across the repository.

## Policy Rules

The following rules are enforced during the CI pipeline:

1. **Branch Protection**: PRs must target an allowed base branch (e.g., `main`, `release/*`). Direct pushes to protected branches are not allowed (this is typically enforced by GitHub repository settings, but the CI pipeline checks that the PR target is valid).
2. **Required Status Checks**: All required CI jobs (build, lint, test) must pass before a merge is permitted.
3. **Dependency Control**: No unapproved dependencies can be added. The lockfile (`pnpm-lock.yaml`) changes are monitored and must not introduce known malicious packages or unauthorized additions.
4. **Secret Scanning**: Code must not contain hardcoded secrets, API keys, or credentials.

These rules are enforced via the `policy-gate.yml` reusable workflow and pre-merge hooks.
