# Claude Code Repo Contract

> **Summit/IntelGraph Platform** - AI-Assisted Development Configuration

This directory contains the Claude Code configuration for the Summit/IntelGraph platform, enabling efficient AI-assisted development with proper guardrails, conventions, and productivity tools.

## Golden Path

The following commands are the **only** supported way to interact with this repository.

| Action | Command | Description |
|:---|:---|:---|
| **Bootstrap** | `make bootstrap` | Install dependencies (pnpm, python venv), setup hooks. |
| **Up** | `make up` | Start development services (Docker Compose). |
| **Smoke** | `make dev-smoke` | Quick health check of running services. |
| **GA** | `make ga` | Full Gate: Lint, Test, Security. Must be green to merge. |

> **Note**: `make smoke` performs a full fresh-clone verification (Bootstrap -> Up -> Smoke). Use `make dev-smoke` for quick iteration on a running stack.

## Repo Map

| Directory | Purpose |
|:---|:---|
| `server/` | Node.js/Express Backend API & Services |
| `client/` | React/Vite Frontend Application |
| `packages/` | Shared workspace packages (monorepo libraries) |
| `docs/` | Project documentation & architectural records |
| `scripts/` | Automation, deployment, and verification scripts |
| `policy/` | OPA (Open Policy Agent) policy definitions |

## PR Discipline

All Claude-authored Pull Requests must adhere to the following strict standards:

1.  **Atomic Scope**: One prompt = One PR. Do not mix refactors with features.
2.  **Verification**: You must run `make dev-smoke` (if local services are up) or `make ga` (for logic changes) before submitting.
3.  **Evidence**: Every PR Body must use the template at `.prbodies/claude-evidence.md`.

> **Requirement**: Configure your PR tool to use `.prbodies/claude-evidence.md` or copy/paste it manually.

## When GA is Red

If `make ga` fails, follow these triage steps using **only** these commands:

1.  **Check Logs**: `make logs` (tails all services)
2.  **Reset Environment**: `make clean` (removes artifacts, containers, volumes)
3.  **Manual Gate Run**: `./scripts/ga-gate.sh` (run directly to see specific failures without Make wrapper)
4.  **Deep Clean**: `make down && docker system prune -f` (if Docker is stuck)
