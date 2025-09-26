# Summit Linting Guide

This repository includes an incremental linting baseline focused on critical frontend and backend entry points. The goal is to
steadily expand coverage while keeping changes reviewable.

## Tooling Overview

- **ESLint** (flat config in `eslint.config.js`) with TypeScript, React, accessibility, and security rules.
- **Prettier** (JSON config in `.prettierrc`) for consistent formatting across editors and CI.
- **PNPM scripts**:
  - `pnpm lint` – run linting on the curated baseline files.
  - `pnpm lint:fix` – apply auto-fixes where possible.

## Current Lint Targets

`pnpm lint` currently covers:

- `client/src/components/ComplianceBoard.tsx`
- `client/src/layout/AppHeader.tsx`
- All TypeScript modules under `client/src/store/`
- `server/src/config/env.ts`
- `server/src/config/logger.ts`

This scope ensures coverage of representative React UI, shared state management, and Node.js configuration code without being
blocked by thousands of legacy issues. Use this baseline for new work in these areas and expand coverage as files are modernized.

## Running Locally

1. Install dependencies (once):
   ```bash
   pnpm install --filter . --ignore-scripts
   ```
2. Lint:
   ```bash
   pnpm lint
   ```
3. Auto-fix (optional):
   ```bash
   pnpm lint:fix
   ```

## Continuous Integration

GitHub Actions (`.github/workflows/lint.yml`) executes the same `pnpm lint` command on pushes and pull requests against `main`.
Ensure the workflow stays green before merging.

## Extending Coverage

When refactoring additional areas:

1. Fix lint violations in the target files.
2. Update `eslint.config.js` to include the new glob(s).
3. Append the glob(s) to the `pnpm lint` script in `package.json`.
4. Document the change in this guide so future contributors know the expected scope.

Aim to expand in small batches (e.g., a feature folder at a time) to keep reviews manageable.

## Formatting Standards

Prettier enforces:

- 100 character line width
- 2-space indentation
- Semicolons and trailing commas
- Consistent arrow/function formatting

Use `pnpm lint:fix` or your editor's Prettier integration to auto-format.
