# Semantic Versioning Policy

This project uses semantic versioning labels on every pull request to clarify the intended release impact.

## Required labels

Use exactly one of the following labels on every pull request:

- `semver:patch` — Bug fixes, docs-only changes, refactors, or internal tooling that do not add or remove public behavior.
- `semver:minor` — Backward-compatible feature additions or enhancements that extend public behavior without breaking existing consumers.
- `semver:major` — Breaking changes to public APIs, contracts, infrastructure expectations, or deployment/runtime compatibility.

## How to choose a label

1. **Start with the blast radius.** If any consumer-visible contract changes (APIs, events, schemas, CLI flags), default to `semver:major` unless you can guarantee backward compatibility.
2. **Check for additive behavior.** New endpoints, feature flags default-off, or configuration options that leave existing flows untouched should be `semver:minor`.
3. **Constrain to fixes.** Regressions, bug fixes, docs, test-only, or observability-only improvements should be `semver:patch`.
4. **Resolve ambiguity early.** If uncertain, request guidance from the Release Captain before merging.

## Impact on release cadence

- Releases without a semver label are blocked from promotion until labeled.
- `semver:patch` changes may batch into the next patch release train.
- `semver:minor` changes queue for the next minor release window.
- `semver:major` changes require a dedicated release plan with explicit approval and migration notes.

## Workflow integration

- The `check-semver-label` script validates that each PR has exactly one semver label and maps it to the intended bump type.
- The CI workflow runs in warn-only mode initially; failures surface as artifacts but do not block merges.
- Keep the label aligned with the contents of the changelog entry and release notes.
