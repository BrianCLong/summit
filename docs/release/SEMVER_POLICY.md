# Semantic Versioning Policy

This repository adheres to [Semantic Versioning 2.0.0](https://semver.org/).

## Label Mapping

Every Pull Request must be labeled to indicate the type of change. This allows our release automation to calculate the next version number correctly.

| Label           | SemVer Effect | Description                                                       |
| --------------- | ------------- | ----------------------------------------------------------------- |
| `major`         | Major (X.0.0) | Incompatible API changes or breaking changes.                     |
| `minor`         | Minor (0.X.0) | New functionality in a backward compatible manner.                |
| `patch`         | Patch (0.0.X) | Backward compatible bug fixes.                                    |
| `semver:major`  | Major (X.0.0) | Alternative label for Major changes.                              |
| `semver:minor`  | Minor (0.X.0) | Alternative label for Minor changes.                              |
| `semver:patch`  | Patch (0.0.X) | Alternative label for Patch changes.                              |
| `norelease`     | None          | Changes that do not require a release (e.g., CI only, docs only). |
| `documentation` | None          | Documentation only changes.                                       |

## How to Choose a Label

- **Major**: Use when you remove or change existing public APIs, or introduce breaking behavioral changes.
- **Minor**: Use when you add new features or deprecated APIs without removing them.
- **Patch**: Use when you fix a bug or make internal changes that do not affect the public API.
- **No Release**: Use for maintenance tasks, CI configuration, or documentation updates that do not warrant a new version number.

## Enforcement

A CI check verifies that every Pull Request has exactly one of these labels. Currently, this check is in **Warn-Only** mode.
