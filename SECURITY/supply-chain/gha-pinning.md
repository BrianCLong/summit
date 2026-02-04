# GitHub Actions Pinning Policy

## Overview
To ensure supply-chain security and prevent unexpected changes in our CI/CD pipelines, all third-party GitHub Actions must be pinned to a specific commit SHA.

## Requirements
1. **Always use SHAs**: Use the full 40-character commit SHA instead of a tag (e.g., `v1`) or branch (e.g., `main`).
2. **Comment with Tag**: For readability, add a comment indicating the version tag associated with the SHA.

## Example
**Correct:**
```yaml
uses: actions/checkout@1d96c772d19495a3b5c517cd2bc0cb401ea0529f # v4.1.3
```

**Incorrect:**
```yaml
uses: actions/checkout@v4
```

## Exceptions
Internal actions or trusted foundational actions may be exempted with approval from the Security team.
