# Monorepo & pnpm Guide

This repository uses **pnpm** as its canonical package manager and workspace tool.

## Prerequisites

- **Node.js**: >=18.18 (Managed via `.nvmrc`)
- **pnpm**: >=9.12.0 (Managed via `package.json` `packageManager` field)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Use the correct Node version
nvm use

# 3. Enable corepack (optional but recommended)
corepack enable

# 4. Install dependencies
pnpm install

# 5. Build the monorepo
pnpm build
```

## Workspace Structure

The monorepo is organized into workspaces defined in `pnpm-workspace.yaml`:

- `apps/*`: Applications (web, mobile, server, etc.)
- `packages/*`: Shared libraries and packages
- `services/*`: Backend microservices
- `tools/*`: Internal tooling
- `client`: Legacy frontend (being migrated)
- `server`: Legacy backend (being migrated)

## Daily Workflow

### Installing Dependencies

Always use `pnpm install` at the root.

```bash
pnpm install
```

**Do not use `npm install` or `yarn install`.**

### Adding a Dependency

To add a dependency to a specific workspace (e.g., `apps/web`):

```bash
pnpm add axios --filter apps/web
```

To add a dependency to the root (e.g., dev tools):

```bash
pnpm add -w -D turbo
```

### Running Scripts

You can run scripts across the monorepo using `pnpm -r` or `turbo`.

```bash
# Run test in all packages
pnpm -r run test

# Run build in specific package
pnpm --filter apps/web build
```

## CI/CD

In CI environments, use:

```bash
pnpm install --frozen-lockfile
```

This ensures a deterministic install based on `pnpm-lock.yaml`.

## Troubleshooting

### "Cannot read properties of undefined (reading 'name')"

This error usually indicates a malformed `package.json` or a workspace configuration issue. Ensure all `package.json` files in included workspaces have a valid `name` and `version`.

### Native Build Failures

If you encounter native build failures (e.g., `isolated-vm`, `canvas`, `sharp`), ensure you have the necessary build tools installed (`build-essential`, `python3`, `pkg-config`, etc.).

```bash
# Ubuntu
sudo apt-get install build-essential python3 pkg-config libpixman-1-dev libcairo2-dev libpango1.0-dev
```

## Legacy & Quarantined Packages

Packages that are broken or unmaintained have been moved to `legacy/` or excluded from the workspace. If you need to work on them, move them back to `packages/` or `services/` and fix their dependencies.
