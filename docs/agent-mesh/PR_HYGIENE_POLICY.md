# PR Hygiene Policy

## Overview
This policy ensures that Pull Requests are atomic, focused, and safe to merge.

## Rules

### 1. Atomic Scope
A PR should focus on a single domain.
- **Fail**: A PR touches `infra/` AND `docs/` AND `packages/backend`.
- **Pass**: A PR touches `infra/` only.

### 2. Forbidden Changes
- No large deletions (> 50 files) without "refactor" label.
- No changes to `LOCK` files without corresponding package.json changes.
- No bidirectional control characters.

### 3. Title Convention
PR titles must follow Conventional Commits:
- `feat(scope): description`
- `fix(scope): description`
- `chore(scope): description`

### 4. Enforcement
This policy is enforced by the `pr-hygiene` check in CI.
