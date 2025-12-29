# Semantic Versioning Policy

## Overview
This repository adheres to [Semantic Versioning 2.0.0](https://semver.org/). All Pull Requests (PRs) must be labeled to indicate the type of version bump they introduce. This allows for automated versioning and ensures that the changelog accurately reflects the impact of changes.

## Versioning Scheme
Given a version number `MAJOR.MINOR.PATCH`, increment the:

- **MAJOR** version when you make incompatible API changes.
- **MINOR** version when you add functionality in a backward compatible manner.
- **PATCH** version when you make backward compatible bug fixes.

## PR Labeling Requirements
Every PR targeting the `main` branch must have **exactly one** of the following labels:

| Label | Description | SemVer Bump |
| :--- | :--- | :--- |
| `major` | Breaking changes | MAJOR |
| `minor` | New features (backward compatible) | MINOR |
| `patch` | Bug fixes, docs, chores (backward compatible) | PATCH |

### Special Cases
- **No Release Required**: If a PR typically shouldn't trigger a release (e.g., CI configuration only, minor docs fix that doesn't warrant a patch bump in your specific workflow, though `patch` is usually safe), you might use a label like `norelease` or `skip-release`. However, for this policy, we map everything to at least a `patch` unless configured otherwise. For now, use `patch` for these changes.

## Automation
A CI check runs on every PR to verify that a valid SemVer label is present. The check will fail if:
- No SemVer label is found.
- Multiple SemVer labels are found (ambiguous).

## Enforcement
This policy is enforced via GitHub Actions. Merging is blocked (or the check fails) if the label is missing.
