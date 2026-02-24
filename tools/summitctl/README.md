# Summit Control Plane CLI (`summitctl`)

The official command-line interface for the Summit platform. It provides a "Golden Path" for development, validation, and automation.

## Setup

```bash
cd tools/summitctl
npm install
npm run build
```

## Usage

You can run the tool from the repository root:

```bash
npm run summitctl -- <command> [args]
```

Or make it globally available (optional):
```bash
cd tools/summitctl
npm link
```

## Golden Path Commands

These commands enforce standard workflows across the repository.

### `summitctl init`
**Scaffold Development Environment**

Runs the standard bootstrapping process (`make bootstrap`), installs dependencies, and optionally starts services.

```bash
# Basic setup (dependencies + env)
summitctl init

# Full setup including starting services and running smoke tests
summitctl init --full
```

### `summitctl check`
**Validate Code Quality**

Runs linting, type checking, and security scans without executing the full test suite. Useful for pre-commit checks.

```bash
# Run all checks
summitctl check

# Skip specific checks
summitctl check --no-security
```

### `summitctl test`
**Run Tests**

Executes various tiers of tests.

```bash
# Run all tests (unit, integration, smoke)
summitctl test

# Run specific tier
summitctl test --unit
summitctl test --smoke
```

### `summitctl release-dry-run`
**Simulate Release**

Simulates the release process locally to catch issues before CI.

```bash
summitctl release-dry-run
```

## Task Management

The CLI also includes tools for managing tasks and interacting with the Agentic Control Plane.

- `summitctl task submit`: Submit a new task to the control plane.
- `summitctl task status <id>`: Check task status.
- `summitctl local-task`: Manage local tasks (legacy).
