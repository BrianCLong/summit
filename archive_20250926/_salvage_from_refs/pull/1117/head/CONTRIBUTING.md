# Contributing to IntelGraph

We welcome contributions to the IntelGraph platform! This guide outlines the process for contributing, including development setup, code style, testing, and the pull request workflow.

## 1. Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/brianlong/intelgraph.git
    cd intelgraph
    ```
2.  **Install dependencies and start development environment**:
    Use the provided `Makefile` for a streamlined setup:
    ```bash
    make dev up
    ```
    This command will install Node.js dependencies, set up Docker Compose services (PostgreSQL, Neo4j, etc.), and start the development servers.

## 2. Code Style and Standards

We adhere to strict code style and quality standards.

- **Linting**: We use ESLint for TypeScript/JavaScript and Prettier for code formatting. Ensure your code passes lint checks before submitting.
  ```bash
  npm run lint
  ```
- **Formatting**: Prettier is configured to automatically format code. It's recommended to set up your IDE to format on save or run:
  ```bash
  npm run format
  ```
- **Typing**: All TypeScript code must be strongly typed.
  ```bash
  npm run typecheck
  ```

## 3. Testing

Comprehensive testing is crucial for maintaining code quality and preventing regressions.

- **Unit Tests**: For individual functions and components.
  ```bash
  npm run test:unit
  ```
- **Integration Tests**: For interactions between different modules.
  ```bash
  npm run test:integration
  ```
- **End-to-End (E2E) Tests**: For full system flows, often using Playwright.
  ```bash
  npm run test:e2e
  ```
- **Running All Tests**:
  ```bash
  npm run test
  ```

## 4. Pull Request Process

1.  **Fork the repository** and create your branch from `main`.
2.  **Make your changes** and ensure they adhere to the code style and standards.
3.  **Write clear, concise commit messages** that follow the Conventional Commits specification.
4.  **Ensure all tests pass** locally before pushing.
5.  **Submit a Pull Request (PR)** to the `main` branch.
    - Provide a clear description of your changes.
    - Reference any related issues.
    - Ensure your PR passes all CI checks (linting, testing, building, security scans).

## 5. Security Considerations

When contributing, always keep security in mind:

- Avoid introducing new vulnerabilities.
- Do not hardcode sensitive information (API keys, passwords).
- Be mindful of potential PII handling and data privacy.
- Ensure any new dependencies are secure and regularly updated.

## 6. Documentation

Update relevant documentation (e.g., `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `OPERATIONS.md`) for any new features or significant changes.

---

Thank you for contributing to IntelGraph!
