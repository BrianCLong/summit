# Code Style Guide

> **Last Updated**: 2025-11-20
> **Purpose**: This document describes the automated code style enforcement tools and conventions for the Summit/IntelGraph platform.

## Table of Contents

1. [Overview](#overview)
2. [Automated Tools](#automated-tools)
3. [Editor Setup](#editor-setup)
4. [Available Commands](#available-commands)
5. [Pre-commit Hooks](#pre-commit-hooks)
6. [Configuration Files](#configuration-files)
7. [Language-Specific Guidelines](#language-specific-guidelines)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Summit/IntelGraph platform uses automated tooling to enforce consistent code style across all projects. This ensures:

- **Consistency**: All code follows the same formatting rules
- **Quality**: Linting catches common errors and anti-patterns
- **Efficiency**: Automated fixes reduce manual code review time
- **Onboarding**: New developers can immediately write properly formatted code

### Core Philosophy

**"Format on save, lint on commit, test on push"**

- Code is automatically formatted when you save files
- Linting and type checking run on staged files during commit
- Full test suites run before pushing to protected branches

---

## Automated Tools

### TypeScript/JavaScript

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | Linting and code quality checks | `eslint.config.js`, `.eslintrc.cjs` |
| **Prettier** | Code formatting | `.prettierrc`, `.prettierignore` |
| **TypeScript** | Type checking | `tsconfig.base.json`, `tsconfig.build.json` |

### Python

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Ruff** | Fast Python linter and formatter | `ruff.toml` |

### Git

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Husky** | Git hooks management | `.husky/` directory |
| **lint-staged** | Run linters on staged files | `package.json` |
| **commitlint** | Enforce commit message conventions | `commitlint.config.cjs` |
| **Gitleaks** | Secret scanning | Built-in config |

### Editor

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **EditorConfig** | Editor-agnostic formatting rules | `.editorconfig` |
| **VS Code** | IDE settings | `.vscode/settings.json` |

---

## Editor Setup

### Visual Studio Code (Recommended)

1. **Install Required Extensions**:
   ```bash
   # Essential extensions
   code --install-extension esbenp.prettier-vscode
   code --install-extension dbaeumer.vscode-eslint
   code --install-extension editorconfig.editorconfig
   code --install-extension charliermarsh.ruff
   ```

2. **Configuration**: The project includes `.vscode/settings.json` with optimized settings:
   - Format on save enabled
   - ESLint auto-fix on save
   - Proper formatter associations for all file types

3. **Workspace TypeScript**: Use the workspace TypeScript version:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "TypeScript: Select TypeScript Version"
   - Choose "Use Workspace Version"

### Other Editors

All editors that support EditorConfig will automatically use the settings in `.editorconfig`:

- **IntelliJ IDEA/WebStorm**: EditorConfig support is built-in
- **Sublime Text**: Install the EditorConfig package
- **Vim/Neovim**: Install the editorconfig-vim plugin
- **Emacs**: Install the editorconfig-emacs package

---

## Available Commands

### Formatting

```bash
# Format all files (TypeScript, JavaScript, JSON, YAML, Markdown, etc.)
pnpm run format

# Check formatting without making changes
pnpm run format:check

# Format Python files only
pnpm run format:py

# Check Python formatting
pnpm run format:py:check
```

### Linting

```bash
# Run ESLint across all workspaces (cached)
pnpm run lint

# Fix ESLint issues automatically
pnpm run lint:fix

# Check without fixing
pnpm run lint:check

# Lint Python files
pnpm run lint:py

# Fix Python linting issues
pnpm run lint:py:fix
```

### Type Checking

```bash
# Type check all TypeScript files using project references
pnpm run typecheck

# Type check specific workspace
pnpm run typecheck:server
pnpm run typecheck:client
```

### Combined Style Checks

```bash
# Check all code style issues (formatting + linting)
pnpm run style:check

# Fix all code style issues automatically
pnpm run style:fix
```

### Full CI Suite

```bash
# Run the complete CI pipeline locally
pnpm run ci

# This runs:
# 1. pnpm run lint
# 2. pnpm run typecheck
# 3. pnpm run test
```

---

## Pre-commit Hooks

### What Runs on Commit

When you run `git commit`, the following checks are automatically executed **only on staged files**:

1. **Secret Scanning** (Gitleaks)
   - Scans for accidentally committed secrets
   - Blocks commit if secrets are detected

2. **Lint-staged**
   - **TypeScript/JavaScript**: ESLint + Prettier
   - **Python**: Ruff check + Ruff format
   - **GraphQL**: Prettier
   - **Other files** (JSON, YAML, Markdown): Prettier

### What Runs on Push

When you run `git push`, additional checks run:

1. **PR Guard** (on protected branches)
   - Enforces file count and size limits
   - Prevents accidental large commits

2. **Quick Tests** (on protected branches)
   - Fast unit tests for sanity checking

### Bypassing Hooks (Not Recommended)

In rare cases, you may need to bypass hooks:

```bash
# Skip pre-commit hooks (NOT RECOMMENDED)
git commit --no-verify -m "emergency fix"

# Skip pre-push hooks (NOT RECOMMENDED)
git push --no-verify
```

**⚠️ Warning**: Only bypass hooks for emergency fixes. Always fix the issues afterward.

---

## Configuration Files

### `.prettierrc` - Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Key Rules**:
- Semicolons required
- Single quotes for strings
- 80-character line width
- 2-space indentation
- LF line endings

### `eslint.config.js` - ESLint Configuration

**Key Rules**:
- `no-console`: warn (use proper logging)
- `no-debugger`: error
- `no-var`: error (use `const` or `let`)
- `prefer-const`: warn
- `eqeqeq`: error (use `===` and `!==`)
- `@typescript-eslint/no-unused-vars`: warn (with `_` prefix exception)
- `@typescript-eslint/no-explicit-any`: off (pragmatic for migration)

### `ruff.toml` - Python Configuration

**Key Settings**:
- Line length: 100 characters
- Target: Python 3.11+
- Enabled rules: pycodestyle, Pyflakes, isort, pep8-naming, pyupgrade
- Auto-fix enabled for all rules

### `.editorconfig` - Editor Configuration

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

### `commitlint.config.cjs` - Commit Message Format

Enforces [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

**Examples**:
```
feat(api): add entity search endpoint
fix(graph): resolve neo4j connection timeout
docs(readme): update quickstart instructions
chore(deps): update dependencies
```

---

## Language-Specific Guidelines

### TypeScript/JavaScript

1. **Import Order** (enforced by ESLint):
   ```typescript
   // 1. External dependencies
   import React from 'react';
   import { ApolloClient } from '@apollo/client';

   // 2. Internal packages
   import { EntityType } from '@intelgraph/types';

   // 3. Relative imports
   import { EntityCard } from './components/EntityCard';
   import { useGraphData } from '../hooks/useGraphData';
   ```

2. **Naming Conventions**:
   - Files: `camelCase.ts`, `PascalCase.tsx` (for components)
   - Variables/Functions: `camelCase`
   - Classes/Interfaces/Types: `PascalCase`
   - Constants: `SCREAMING_SNAKE_CASE`

3. **Best Practices**:
   - Prefer `const` over `let`, never use `var`
   - Use arrow functions for callbacks
   - Use template literals instead of string concatenation
   - Avoid nested ternaries
   - Use `===` instead of `==`

### Python

1. **Import Order** (enforced by Ruff):
   ```python
   # 1. Standard library
   import os
   import sys

   # 2. Third-party packages
   import numpy as np
   import pandas as pd

   # 3. Local imports
   from intelgraph.entities import Entity
   from summit.graph import GraphService
   ```

2. **Naming Conventions**:
   - Files/Modules: `snake_case.py`
   - Variables/Functions: `snake_case`
   - Classes: `PascalCase`
   - Constants: `SCREAMING_SNAKE_CASE`

3. **Best Practices**:
   - Use type hints where practical
   - Prefer f-strings for formatting
   - Use list/dict comprehensions when readable
   - Follow PEP 8 guidelines

### GraphQL

1. **Naming Conventions**:
   - Types: `PascalCase`
   - Fields: `camelCase`
   - Arguments: `camelCase`

2. **Example**:
   ```graphql
   type Entity {
     id: ID!
     name: String!
     entityType: EntityType!
   }

   type Query {
     entity(id: ID!): Entity
     searchEntities(query: String!, limit: Int): [Entity!]!
   }
   ```

### Markdown

1. **Formatting**:
   - 100-character line width for prose
   - Always wrap prose (enforced by Prettier)
   - Use ATX-style headers (`#` instead of underlines)

2. **Best Practices**:
   - Include table of contents for long documents
   - Use code fences with language identifiers
   - Keep lists consistent (all `-` or all `*`)

---

## Troubleshooting

### ESLint Errors on Fresh Checkout

```bash
# Clear ESLint cache
rm -rf node_modules/.cache/eslint

# Reinstall dependencies
pnpm install

# Run lint again
pnpm run lint
```

### Prettier and ESLint Conflicts

This shouldn't happen as Prettier rules are disabled in ESLint config. If you see conflicts:

```bash
# Check for conflicting rules
pnpm exec eslint-config-prettier eslint.config.js
```

### Pre-commit Hook Fails

1. **Review the error messages** - they usually indicate what's wrong
2. **Fix the issues**:
   ```bash
   # Auto-fix linting issues
   pnpm run lint:fix

   # Format all files
   pnpm run format

   # Check type errors
   pnpm run typecheck
   ```
3. **Stage the fixes and commit again**:
   ```bash
   git add .
   git commit -m "your message"
   ```

### Gitleaks False Positive

If Gitleaks incorrectly flags something as a secret:

1. Review the detection to ensure it's truly not a secret
2. Add it to `.gitleaksignore` (create if doesn't exist):
   ```
   path/to/file:line-number
   ```

### Type Checking is Slow

Type checking uses project references which can be slow on first run:

```bash
# Clean build cache
rm -rf **/.tsbuildinfo

# Rebuild incrementally
pnpm run typecheck
```

For faster iteration during development, use `tsc --noEmit` in specific packages:

```bash
cd apps/server
pnpm exec tsc --noEmit
```

### Ruff Not Found

Install Ruff globally or via the Python virtual environment:

```bash
# Using pip
pip install ruff

# Using pipx (recommended)
pipx install ruff

# Or use the project's venv
source .venv/bin/activate
pip install ruff
```

---

## Best Practices Summary

### DO ✅

- Let the tools format your code automatically
- Run `pnpm run style:fix` before committing
- Use the VS Code extensions for real-time feedback
- Write descriptive commit messages following Conventional Commits
- Review pre-commit hook errors and fix them

### DON'T ❌

- Manually format code (let Prettier handle it)
- Bypass pre-commit hooks without good reason
- Commit with linting errors
- Use `// eslint-disable` without justification
- Commit secrets or credentials

### Tips 💡

1. **Set up your editor properly** - It will save you time in the long run
2. **Run style checks before committing** - `pnpm run style:check`
3. **Use auto-fix liberally** - `pnpm run style:fix`
4. **Keep commits small** - Easier to review and fix issues
5. **Read the error messages** - They usually tell you exactly what's wrong

---

## Additional Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [EditorConfig](https://editorconfig.org/)

---

## Questions?

If you encounter issues not covered in this guide:

1. Check the [main README](../README.md)
2. Review the [CLAUDE.md](../CLAUDE.md) AI assistant guide
3. Ask the team in the development channel
4. Open an issue in the repository
