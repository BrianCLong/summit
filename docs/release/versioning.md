# Semantic Versioning Guide

> **Version**: 1.0
> **Last Updated**: 2025-12-19
> **Owner**: Platform Team

This document describes the semantic versioning rules used by the MAE Release Captain automation.

## Version Format

We follow [Semantic Versioning 2.0.0](https://semver.org/) with the format:

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

### Examples

| Version | Description |
|---------|-------------|
| `1.0.0` | Initial stable release |
| `1.0.1` | Patch release with bug fixes |
| `1.1.0` | Minor release with new features |
| `2.0.0` | Major release with breaking changes |
| `1.2.3-rc.1` | Release candidate 1 for version 1.2.3 |
| `1.2.3-rc.2` | Release candidate 2 (if rc.1 had issues) |

## Version Bump Rules

Version bumps are determined automatically from [Conventional Commits](https://www.conventionalcommits.org/).

### Major Version (X.0.0)

Increment MAJOR when making incompatible API changes:

```
feat!: remove deprecated authentication endpoint

BREAKING CHANGE: The /v1/auth endpoint has been removed.
Use /v2/auth instead.
```

Triggers:
- Commits with `!` after the type (e.g., `feat!:`, `fix!:`)
- Commits with `BREAKING CHANGE:` or `BREAKING-CHANGE:` in the body

### Minor Version (X.Y.0)

Increment MINOR when adding functionality in a backward-compatible manner:

```
feat(api): add bulk entity import endpoint
```

```
feat: implement dark mode toggle
```

Triggers:
- Commits with type `feat`

### Patch Version (X.Y.Z)

Increment PATCH when making backward-compatible bug fixes:

```
fix(auth): resolve token refresh race condition
```

```
fix: correct date formatting in reports
```

Triggers:
- Commits with type `fix`
- Any other commit types (defaults to patch)

## Conventional Commit Types

### Standard Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `perf` | Performance improvement | Patch |
| `refactor` | Code refactoring | Patch |
| `docs` | Documentation only | Patch |
| `style` | Code style (formatting, etc.) | Patch |
| `test` | Adding or updating tests | Patch |
| `build` | Build system changes | Patch |
| `ci` | CI configuration changes | Patch |
| `chore` | Other changes | Patch |
| `revert` | Reverting a commit | Patch |

### Scopes

Scopes are optional and indicate the area of the codebase affected:

```
feat(api): ...        # API-related feature
fix(auth): ...        # Authentication fix
perf(graphql): ...    # GraphQL performance
docs(readme): ...     # README documentation
chore(deps): ...      # Dependency updates
chore(security): ...  # Security-related chores
```

## Release Candidates

Release candidates are created during the release train process:

### RC Naming

```
X.Y.Z-rc.N
```

Where:
- `X.Y.Z` is the target version
- `N` is the RC number (starts at 1)

### RC Progression

1. **rc.1**: Initial release candidate from train cut
2. **rc.2+**: Created if rc.1 fails validation or needs fixes
3. **Final**: `X.Y.Z` tag created on successful promotion

### Example Flow

```
main branch commits:
  feat(api): add search endpoint
  fix(auth): resolve token issue
  docs: update API guide

↓ Release train cut (Wednesday 17:00 UTC)

v1.2.0-rc.1 created
  ├── Stage deployment
  ├── Validation passes
  └── Production canary

↓ Production 100% successful

v1.2.0 final tag created
```

## Pre-release Labels

Pre-release versions may include additional labels:

| Label | Usage |
|-------|-------|
| `rc.N` | Release candidate N |
| `beta.N` | Beta release (rarely used) |
| `alpha.N` | Alpha release (internal only) |

## Hotfix Versions

Hotfixes increment the patch version from the production release:

```
Production: v1.2.3
Hotfix: v1.2.4

Branch: hotfix/v1.2.4
```

Hotfixes skip the RC stage and go directly to production after stage validation.

## Version Calculation

The semver calculation script analyzes commits since the last release:

```python
# Pseudo-code for version calculation

last_version = get_last_tag()  # e.g., v1.2.3
commits = get_commits_since(last_version)

has_breaking = any(commit.breaking for commit in commits)
has_feature = any(commit.type == 'feat' for commit in commits)

if has_breaking:
    new_version = bump_major(last_version)
elif has_feature:
    new_version = bump_minor(last_version)
else:
    new_version = bump_patch(last_version)

rc_version = f"{new_version}-rc.{get_next_rc_number(new_version)}"
```

## Best Practices

### Writing Good Commit Messages

```
# Good
feat(api): add pagination support for entity list

Add offset and limit parameters to the entity list endpoint.
This enables efficient loading of large datasets.

Closes #123

# Bad
update api
```

### Breaking Changes

When introducing breaking changes:

1. Use `!` suffix on commit type
2. Include `BREAKING CHANGE:` in body with migration instructions
3. Update documentation
4. Coordinate with consuming teams

```
feat(api)!: change entity ID format from integer to UUID

BREAKING CHANGE: Entity IDs are now UUIDs instead of integers.
Migration steps:
1. Run migration script: ./scripts/migrate-entity-ids.sh
2. Update client applications to use string IDs
3. Update any stored ID references
```

### Avoiding Version Churn

- Batch related changes into single features
- Use feature flags for incomplete features
- Coordinate breaking changes with major releases

## Tags and Branches

### Tag Format

| Tag Pattern | Description |
|-------------|-------------|
| `vX.Y.Z` | Production release |
| `vX.Y.Z-rc.N` | Release candidate |
| `vX.Y.Z-hotfix` | Hotfix marker (temporary) |

### Branch Format

| Branch Pattern | Description |
|----------------|-------------|
| `release/vX.Y.Z-rc.N` | Release branch |
| `hotfix/vX.Y.Z` | Hotfix branch |
| `main` | Development branch |

## Version in Code

### Package.json

```json
{
  "version": "1.2.3"
}
```

### Health Endpoint

```json
{
  "version": "1.2.3",
  "commit": "abc1234",
  "build_time": "2025-01-15T10:30:00Z"
}
```

### Container Labels

```dockerfile
LABEL org.opencontainers.image.version="1.2.3"
LABEL org.opencontainers.image.revision="abc1234567890"
```

## Frequently Asked Questions

### Q: What if I need to skip a version number?

Use `--force-version` in the release train:

```bash
gh workflow run release-train.yml -f force_version=2.0.0
```

### Q: How do I fix a bad release candidate?

Create fix commits on main, then trigger a new train cut. The RC number will increment automatically (rc.1 → rc.2).

### Q: Can I release without going through rc?

No. All releases go through at least one RC for stage validation. Hotfixes are the only exception and have stricter guardrails.

### Q: What happens if I forget to use conventional commits?

The version calculator defaults to patch bump for non-conventional commits. To ensure correct versioning, always use the format:

```
type(scope): description
```

## Related Documentation

- [Release Captain Runbook](../../runbooks/release-captain.md)
- [Release Train Workflow](../../.github/workflows/release-train.yml)
- [Semver Calculator Script](../../.ci/scripts/release/semver_calc.py)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
