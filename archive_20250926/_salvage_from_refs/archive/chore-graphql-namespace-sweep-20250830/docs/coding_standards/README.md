# IntelGraph Coding Standards

This document outlines the coding standards and best practices to be followed across the IntelGraph monorepo. Adherence to these standards ensures code quality, maintainability, security, and consistency.

## 1. Language and Runtime Versions

*   **Node.js:** Version 18+ for all Node.js-based services and applications.
*   **TypeScript:** Strict mode (`"strict": true` in `tsconfig.json`) is enforced for all TypeScript projects.
*   **Python:** Version 3.12+ for all data processing, operations (ops) scripts, and backend services.

## 2. API and Data Handling

*   **GraphQL Gateway:**
    *   All GraphQL interactions must go through a central gateway.
    *   **Persisted Queries:** Utilize persisted queries to enhance security, reduce network overhead, and improve performance.
    *   **Cost Limits:** Implement and enforce query cost limits to prevent resource exhaustion and denial-of-service attacks.
*   **Parameterized Queries:** Always use parameterized queries for database interactions to prevent SQL injection and similar vulnerabilities.
*   **Input Validation:** Rigorous input validation must be performed at all API boundaries and data entry points to ensure data integrity and prevent malicious inputs.
*   **CSRF/XSS Guards:** Implement Cross-Site Request Forgery (CSRF) and Cross-Site Scripting (XSS) protection mechanisms for all web-facing components.

## 3. Observability and Operations

*   **Structured Logs:** All logging must be structured (e.g., JSON format) to facilitate easy parsing, searching, and analysis by logging systems.
*   **Feature Flags:** Use feature flags for all risky or experimental changes. This enables safe deployment, A/B testing, and easy rollback without code redeployment.

## 4. Version Control and Collaboration

*   **Conventional Commits:** All commit messages must adhere to the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/). This enables automated changelog generation and semantic versioning.
    *   **Format:** `<type>[optional scope]: <description>`
    *   **Example:** `feat(connectors): add new Splunk connector`
*   **Branching Strategy:** Utilize a feature-branching workflow.
    *   **Naming Convention:** `feature/<feature-name>` (e.g., `feature/prov-ledger-beta`), `bugfix/<bug-description>`, `hotfix/<hotfix-description>`.
    *   Branches should be short-lived and merged back into `main` frequently.
*   **Pull Request (PR) Checklist:** Every Pull Request must include a comprehensive checklist to ensure all necessary steps are completed before merging.
    *   **Acceptance Proofs:** PRs must include evidence that the changes meet the defined acceptance criteria (e.g., links to passing tests, screenshots, demo videos).
    *   Code review completed.
    *   All automated tests (unit, integration, E2E) pass.
    *   Documentation updated (if applicable).
    *   Migration scripts reviewed (if applicable).
    *   Security considerations addressed.

## 5. Code Style and Quality

*   **Linters & Formatters:** Use project-configured linters (ESLint for JS/TS, Ruff for Python) and formatters (Prettier) to enforce consistent code style and catch potential issues early.
*   **Type Hinting:** Extensive use of type hints in Python and TypeScript to improve code readability, maintainability, and enable static analysis.
*   **Comments:** Add comments sparingly, focusing on *why* a piece of code exists or *why* a particular decision was made, rather than *what* the code does (which should be clear from the code itself).
