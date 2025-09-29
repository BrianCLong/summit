# Contributing

- Fork the repo and create feature branches.
- Run tests, linting, and formatting locally before PRs.
- Follow Conventional Commits for messages (enforced by commitlint).
- Ensure code coverage meets 90% patch threshold (enforced by Codecov).
- For new features, include brief docs and update CHANGELOG if applicable.

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/intelgraph.git
cd intelgraph

# 2. Install dependencies
npm ci

# 3. Start development environment
npm run dev

# 4. Run quality checks before committing
npm run lint        # Check code quality
npm run typecheck   # Verify TypeScript
npm run format      # Auto-fix formatting
npm run test        # Run all tests
npm run test:coverage # Check coverage thresholds
```

## Pre-Commit Quality Gates

All PRs must pass these checks:

```bash
# Linting & Formatting
npm run lint                    # ESLint for JS/TS
npm run format:check           # Prettier formatting
npm run typecheck              # TypeScript types

# Testing & Coverage
npm run test:coverage          # Unit tests with coverage
npm run test:e2e              # End-to-end tests
npm run test:performance      # k6 performance tests

# Security
npm audit --audit-level=high  # Dependency security scan
```

## Component-Specific Development

### Server (Backend)
```bash
cd server
npm ci && npm test
npm run test:coverage    # Must maintain 90% coverage
npm run lint && npm run typecheck
```

### Client (Frontend)
```bash
cd client
npm ci && npm test
npm run test:coverage    # Must maintain 90% coverage
npm run lint && npm run typecheck
```

### Python Services
```bash
cd python
pip install -e .[dev] && pytest
ruff check .             # Linting
ruff format .           # Formatting
```

## Development Process

We use a sprint-based development process to manage our work. Each sprint is two weeks long and focuses on a small set of high-priority tasks. We use GitHub project boards to track the progress of our work.

If you are a new contributor, we recommend that you start by looking at the issues in the "To Do" column of our [project boards](docs/project_management/github_project_boards/). These are tasks that have been identified as good first issues for new contributors.

Before you start working on an issue, please leave a comment on the issue to let us know that you are working on it. This will help us avoid duplicating work.

When you have finished working on an issue, please submit a pull request. In your pull request, please include a link to the issue you have been working on.

