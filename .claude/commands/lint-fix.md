# Lint and Fix Command

Run linting and formatting tools to ensure code quality.

## Quick Fix All

```bash
pnpm lint:fix && pnpm format
```

## Individual Commands

### Lint Check (No Fix)
```bash
pnpm lint
```

### Lint with Auto-Fix
```bash
pnpm lint:fix
```

### Format Check (No Fix)
```bash
pnpm format:check
```

### Format Fix
```bash
pnpm format
```

### TypeScript Check
```bash
pnpm typecheck
```

### All Style Checks
```bash
pnpm style:check
```

### All Style Fixes
```bash
pnpm style:fix
```

## Python Linting

### Ruff Check
```bash
pnpm lint:py
```

### Ruff Fix
```bash
pnpm lint:py:fix
```

### Ruff Format
```bash
pnpm format:py
```

## Specific File/Directory

### Lint Specific Files
```bash
npx eslint "server/src/**/*.ts" --fix
```

### Format Specific Files
```bash
npx prettier --write "client/src/**/*.tsx"
```

### Lint Specific Package
```bash
pnpm --filter @intelgraph/api lint:fix
```

## Common Issues and Fixes

### Unused Variables
ESLint flags unused variables. Either:
1. Remove the variable
2. Prefix with `_` (e.g., `_unusedVar`)

### Import Order
ESLint enforces import order:
1. External deps (`react`, `apollo`)
2. Internal packages (`@intelgraph/*`)
3. Relative imports (`./utils`)

### Formatting Conflicts
If ESLint and Prettier conflict:
```bash
# Run Prettier first, then ESLint
pnpm format && pnpm lint:fix
```

## Pre-Commit Integration

The project uses lint-staged for pre-commit:
```json
{
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.py": ["ruff check --fix", "ruff format"]
}
```

## Configuration Files

- ESLint: `eslint.config.js` (flat config v9)
- Prettier: `.prettierrc`
- TypeScript: `tsconfig.base.json`

## Ignoring Files

### ESLint Ignore
Add to `.eslintignore` or use inline:
```javascript
/* eslint-disable rule-name */
```

### Prettier Ignore
Add to `.prettierignore` or use inline:
```javascript
// prettier-ignore
const uglyCode = 1+2+3;
```

## Verify Clean State

After fixing, verify everything passes:
```bash
pnpm lint && pnpm format:check && pnpm typecheck
```
