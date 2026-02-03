# Client TypeScript Typecheck Strategy

## Overview

This document describes the TypeScript type-checking strategy for the `client` package.

## Current Status

| Metric | Value |
|--------|-------|
| **Total Errors** | 0 (app code) |
| **Config Used** | `client/tsconfig.strict.json` |
| **Baseline Mode** | NOT required |
| **CI Behavior** | Fail on any type error |

## Configuration

The client package uses `tsconfig.strict.json` for CI type-checking, which:
- Extends the base `tsconfig.json`
- Enables strict mode
- **Excludes test files** (`**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`)

## Commands

```bash
# Run typecheck locally (from client directory)
pnpm exec tsc --project tsconfig.strict.json --noEmit

# Run CI report script (from repo root)
node scripts/ci/client_typecheck_report.mjs
```

## CI Workflow

The client typecheck runs as a GitHub Actions workflow (`.github/workflows/client-typecheck.yml`):

- **Triggers**: Changes to `client/**/*.ts`, `client/**/*.tsx`, `client/**/*.js`, `client/**/*.jsx`
- **Behavior**: Fail fast on any new type errors
- **Artifacts**: On failure, uploads the typecheck report for debugging

## Files Fixed

During initial setup, the following issues were fixed:

1. **`src/hooks/useFeatureFlag.tsx`** - Fixed React type compatibility issue with JSX.Element
2. **`src/layout/AppHeader.tsx`** - Fixed IconButton href prop type issues
