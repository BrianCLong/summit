# Prompt: pnpm CI cache standardization

## Objective
Standardize GitHub Actions workflows to install pnpm via pnpm/action-setup, enable pnpm store caching with actions/setup-node, and enforce deterministic installs via pnpm install --frozen-lockfile. Update docs/roadmap/STATUS.json to record the CI workflow change.

## Scope
- .github/workflows/
- docs/roadmap/STATUS.json
- prompts/ci/pnpm-ci-cache.md
- prompts/registry.yaml

## Constraints
- Use pinned GitHub Actions versions already present in the repository.
- Keep installs deterministic and cache-aware with pnpm.
- Do not introduce new tooling outside the existing CI stack.

## Deliverables
- Workflow updates using pnpm/action-setup and actions/setup-node cache for pnpm.
- Updated roadmap status entry.
