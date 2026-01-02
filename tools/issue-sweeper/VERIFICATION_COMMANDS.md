# Canonical Verification Commands

This document defines the canonical commands for verifying the repository's health and quality.

## Full Verification Suite

```bash
pnpm verify
```

This runs the main verification script at `scripts/verify.ts`.

## Individual Verification Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. TypeScript Type Checking

```bash
pnpm typecheck
```

Individual packages:
```bash
pnpm typecheck:server
pnpm typecheck:client
```

### 3. Linting

```bash
pnpm lint
```

Strict mode:
```bash
pnpm lint:strict
```

Individual packages:
```bash
pnpm lint:server
pnpm lint:client
```

### 4. Testing

Full test suite:
```bash
pnpm test
```

Individual test suites:
```bash
# Quick sanity check
pnpm test:quick

# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# Smoke tests
pnpm test:smoke

# E2E tests
pnpm test:e2e

# Server tests
pnpm test:server

# Client tests
pnpm test:client
```

### 5. Build

```bash
pnpm build
```

Individual builds:
```bash
pnpm build:client
pnpm build:server
```

### 6. Security Checks

```bash
pnpm security:check
```

### 7. Compliance Checks

```bash
pnpm compliance:check
pnpm verify:compliance
pnpm verify:governance
```

### 8. Schema Validation

```bash
pnpm schema:validate
pnpm schema:diff:strict
```

## Minimal Verification (for CI/local quick checks)

For quick verification during issue fixing:

```bash
# 1. Type check
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Quick test
pnpm test:quick
```

## Pre-commit Hooks

The repository uses Husky for pre-commit hooks:

```bash
pnpm precommit
```

This runs `lint-staged` which checks:
- ESLint fixes
- Type checking for server/client/services

## Issue Sweeper Specific

When fixing issues, the sweeper should:

1. **Before making changes:**
   ```bash
   pnpm typecheck
   pnpm lint
   ```

2. **After making changes:**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test:quick
   pnpm build
   ```

3. **For fixes requiring full validation:**
   ```bash
   pnpm verify
   ```

## Notes

- The repository is a monorepo using pnpm workspaces
- Main packages: `client/`, `server/`, `packages/*`, `apps/*`
- TypeScript is the primary language
- Test runners: Jest, Playwright
- CI workflows are in `.github/workflows/`

## Common Failure Scenarios

### TypeScript Errors
```bash
pnpm typecheck --verbose
```

### Lint Errors
```bash
pnpm lint --fix
```

### Test Failures
```bash
pnpm test --verbose
```

### Build Failures
```bash
pnpm build --verbose
```
