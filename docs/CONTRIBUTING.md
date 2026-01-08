# Contributing Guide

Thank you for your interest in contributing to Summit!

## Code of Conduct

Please adhere to professional standards and respect all contributors.

## Workflow

1.  **Find an Issue**: Look for open issues or create a new one.
2.  **Fork & Clone**: Fork the repository and clone it locally.
3.  **Create a Branch**: Use a descriptive name (e.g., `feat/add-login-flow`, `fix/graph-query`).
4.  **Make Changes**: Write code and tests.
5.  **Verify**: Run `make smoke` to ensure nothing is broken.
6.  **Submit PR**: Push your branch and open a Pull Request.

## Pull Request Guidelines

- **Atomic PRs**: Focus on one specific task or fix per PR.
- **Descriptive Title**: clear and concise.
- **Description**: Explain _what_ changed and _why_.
- **Tests**: Must include unit tests for new logic.
- **Documentation**: Update docs if behavior changes.

## Code Style

- **TypeScript**: We use strict mode.
- **Linting**: Run `npm run lint` before committing.
- **Formatting**: We use Prettier.
- **Naming**:
  - Variables/Functions: `camelCase`
  - Classes/Components: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

## Directory Structure

- `server/`: Backend Node.js code.
- `client/`: Frontend React code.
- `docs/`: Documentation.
- `scripts/`: Utility scripts.

## Review Process

Your code will be reviewed by the "Jules" automated reviewer and/or human maintainers. Address feedback promptly.
