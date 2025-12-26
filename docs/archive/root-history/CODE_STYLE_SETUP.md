# Code Style Tools - Quick Setup Guide

This project uses automated code style enforcement to ensure consistent, high-quality code across all contributions.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Verify Setup

```bash
# Check code formatting
pnpm run format:check

# Check linting
pnpm run lint:check

# Fix all issues automatically
pnpm run style:fix
```

### 3. Editor Setup (Recommended)

Install the recommended VS Code extensions:

1. Open VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Extensions: Show Recommended Extensions"
4. Install all workspace recommendations

Or manually install:
- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **EditorConfig** (editorconfig.editorconfig)
- **Ruff** (charliermarsh.ruff) - for Python

## What's Configured

### Automated Tools

| Tool | Purpose | Auto-runs on |
|------|---------|--------------|
| **Prettier** | Code formatting | Save (in editor) |
| **ESLint** | Linting & code quality | Save (in editor), Commit |
| **Ruff** | Python linting & formatting | Save (in editor), Commit |
| **Gitleaks** | Secret detection | Commit |
| **commitlint** | Commit message format | Commit |

### Pre-commit Hooks

When you commit, the following runs automatically on **staged files only**:

1. ✅ Secret scanning (Gitleaks)
2. ✅ Linting with auto-fix (ESLint/Ruff)
3. ✅ Code formatting (Prettier)
4. ✅ Commit message validation (commitlint)

**This is fast!** Only staged files are checked, not the entire codebase.

## Available Commands

### Formatting

```bash
pnpm run format              # Format all files
pnpm run format:check        # Check formatting without changes
pnpm run format:py           # Format Python files only
```

### Linting

```bash
pnpm run lint                # Lint all files (cached)
pnpm run lint:fix            # Auto-fix linting issues
pnpm run lint:check          # Check without fixing
pnpm run lint:py             # Lint Python files
pnpm run lint:py:fix         # Fix Python linting issues
```

### Combined

```bash
pnpm run style:check         # Check formatting + linting
pnpm run style:fix           # Fix all style issues
```

### Type Checking

```bash
pnpm run typecheck           # Type check all TypeScript
pnpm run typecheck:server    # Type check server only
pnpm run typecheck:client    # Type check client only
```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Examples

```bash
git commit -m "feat(api): add entity search endpoint"
git commit -m "fix(graph): resolve neo4j connection timeout"
git commit -m "docs(readme): update quickstart instructions"
git commit -m "chore(deps): update dependencies"
```

### Valid Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert a previous commit

## Configuration Files

All configuration files are in the root directory:

```
.
├── .editorconfig              # Editor settings
├── .eslintignore              # ESLint ignore patterns
├── .prettierrc                # Prettier configuration
├── .prettierignore            # Prettier ignore patterns
├── .nvmrc                     # Node.js version
├── eslint.config.js           # ESLint rules (flat config)
├── ruff.toml                  # Python Ruff configuration
├── commitlint.config.cjs      # Commit message rules
├── .husky/                    # Git hooks
│   ├── pre-commit            # Pre-commit hook
│   ├── commit-msg            # Commit message hook
│   └── pre-push              # Pre-push hook
└── .vscode/                   # VS Code settings
    ├── settings.json         # Editor settings
    └── extensions.json       # Recommended extensions
```

## Troubleshooting

### Pre-commit hook fails

```bash
# Fix issues automatically
pnpm run style:fix

# Stage the fixes
git add .

# Try committing again
git commit -m "your message"
```

### ESLint or Prettier not working in editor

1. Ensure extensions are installed
2. Reload VS Code: `Cmd/Ctrl+Shift+P` → "Developer: Reload Window"
3. Check VS Code output panel for errors

### Type checking is slow

Type checking uses project references which can be slow on first run. Subsequent runs are faster thanks to caching.

```bash
# Clean build cache if needed
rm -rf **/.tsbuildinfo
pnpm run typecheck
```

### Secret detected by Gitleaks (false positive)

If Gitleaks incorrectly flags something:

1. Verify it's truly not a secret
2. Add to `.gitleaksignore`:
   ```
   path/to/file:line-number
   ```

## Full Documentation

For comprehensive documentation, see:

📖 **[docs/CODE_STYLE_GUIDE.md](docs/CODE_STYLE_GUIDE.md)**

This includes:
- Detailed tool configurations
- Language-specific guidelines
- Best practices
- Advanced troubleshooting

## Need Help?

1. Check the full documentation: [docs/CODE_STYLE_GUIDE.md](docs/CODE_STYLE_GUIDE.md)
2. Review the main README: [README.md](README.md)
3. Ask in the development channel
4. Open an issue

---

**Remember**: The tools are here to help! Let them handle formatting so you can focus on writing great code. 🚀
