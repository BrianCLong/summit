# Contributing

Thank you for helping improve the project! Follow these guidelines for smooth reviews and predictable releases.

## Branching and Commits
- Use `type/scope/short-desc` branches (e.g., `feat/gateway/healthz-endpoint`).
- Conventional Commits are required (e.g., `feat: add preview compose stack`).

## Pull Requests
- Keep PR descriptions concise and link to tracking issues (e.g., `Closes #123`).
- Include screenshots for UI changes and note feature flags that are enabled.
- Ensure CI is green before requesting review.

## Testing Policy
- Add unit tests for new code and run `make test` before pushing.
- Health endpoints must return 200 responses.

## Feature Flags
- Default new flags to OFF. Document flags in the PR body when toggled for previews.

## SBOM and Security
- Generate SBOMs via `make sbom` when changing dependencies.
- Do not commit secrets; follow the guidance in `SECURITY.md` for incident handling.
