# Daily Developer Workflows

This document outlines the standard commands and workflows for daily development.

## Core Commands

We use `pnpm` and `turbo` to manage tasks across the monorepo.

### Starting Development

- **Start All Services**:
  ```bash
  pnpm run dev
  ```
- **Start Server Only**:
  ```bash
  pnpm run server:dev
  ```
- **Start Client Only**:
  ```bash
  pnpm run client:dev
  ```

### Quality Checks

Before pushing, always run the full suite of checks:

- **Linting**:
  ```bash
  pnpm run lint
  pnpm run lint:fix  # Automatically fix issues
  ```
- **Type Checking**:
  ```bash
  pnpm run typecheck
  ```
- **Testing**:
  ```bash
  pnpm run test        # Run all tests
  pnpm run test:watch  # Run in watch mode
  pnpm run test:quick  # Run fast unit tests
  ```
  See **[Testing Guidelines](./testing-guidelines.md)** for detailed patterns, factories, and mocking strategies.

### Database Management

- **Run Migrations**:
  ```bash
  pnpm run db:migrate
  ```
- **Seed Database**:
  ```bash
  pnpm run db:seed
  ```
- **Reset Database**:
  ```bash
  pnpm run db:reset
  ```

## Debugging

- **Server Logs**: Output to the terminal where you ran `pnpm run dev`.
- **Client Logs**: Browser console.
- **VS Code Debugging**: Use the "JavaScript Debug Terminal" in VS Code to run `pnpm run dev` and set breakpoints.

## Adding New Features

1.  **Create Feature Branch**:
    ```bash
    git checkout -b feat/my-new-feature
    ```
2.  **Development Loop**:
    - Write failing test.
    - Implement code.
    - `pnpm run test` to verify.
    - `pnpm run lint` to format.
3.  **Commit**:
    Follow Conventional Commits (e.g., `feat(auth): add login endpoint`).

## Troubleshooting

See [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for common issues.
