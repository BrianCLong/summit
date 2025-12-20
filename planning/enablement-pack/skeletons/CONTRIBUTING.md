# Contributing to the Project

## Getting Started
1. **Clone the repo**: `git clone <url>`
2. **Setup Environment**:
   - Option A: Open in VS Code Dev Containers (Recommended).
   - Option B: Install Node 18, Python 3.10, Go 1.21 manually.
3. **Run Tests**: `npm test` | `pytest` | `go test ./...`

## Pull Request Process
1. Create a branch `feature/my-feature`.
2. Commit changes (ensure pre-commit hooks pass).
3. Open PR using the template.
4. Wait for CI checks (Lint, Test, Build).
5. Get approval from 1 code owner.

## Coding Standards
- **TS**: ESLint + Prettier.
- **Python**: Black + isort.
- **Go**: golangci-lint.
