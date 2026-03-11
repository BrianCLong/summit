# Summit PR Copilot Surface

## Decision

Summit's primary developer workflow surface is the pull request.

This establishes architecture intelligence as an always-on merge signal instead of an opt-in analysis step.

## Why this surface

- PR review already exists in every active software team.
- A PR comment/check is visible to authors, reviewers, and release owners at the exact decision point.
- PR-native feedback scales better than CLI-only usage for sustained adoption and governance coverage.

## Golden interaction loop

1. Developer opens or updates a PR.
2. `Summit PR Copilot` workflow computes architecture impact heuristics.
3. Summit bot updates a sticky PR comment with subsystem impact, fan-in proxy, and CI instability probability.
4. Team adjusts implementation before merge.

## Initial implementation details

- Workflow: `.github/workflows/summit-pr-copilot.yml`
- Trigger: `pull_request` (`opened`, `synchronize`, `reopened`, `ready_for_review`)
- Output: sticky comment marked by `<!-- summit-pr-copilot -->`
- Permissions: `pull-requests: write`, `contents: read`

## Guardrails and evolution

Current metrics are deterministic proxies derived from changed files and diff size; they are intentionally constrained for low operational risk.

Planned evolution:

- Replace heuristics with architecture graph-backed impact analysis.
- Add confidence scores and rollback playbook links.
- Emit machine-readable evidence artifacts for governance pipelines.
