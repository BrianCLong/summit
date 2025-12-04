# Agentic System & Repository Guidelines

This document serves as the **Master Directive** for all autonomous agents operating within the Summit / IntelGraph repository.

## 1. System Architecture

This repository is a **Monorepo** managed with `pnpm`.

*   **`server/`**: The backend services (Node.js/TypeScript/Express/GraphQL).
*   **`apps/web/`**: The frontend application (React/Vite/Tailwind).
*   **`rust/`**: High-performance components (e.g., `psc-runner`).
*   **`prompts/`**: The central registry for Agent personas and workflows.
*   **`docs/`**: Comprehensive documentation.

## 2. Agent Directives

All agents must adhere to the prompt definitions located in the `prompts/` directory.

*   **Registry**: See `prompts/README.md` for the full index of agents and workflows.
*   **Core Personas**:
    *   **Jules**: Global System Optimizer & Harmonizer (`prompts/agents/jules-gemini.md`).
    *   **Codex**: Implementation & Build Specialist (`prompts/agents/codex.md`).
    *   **Claude**: Architect & Reasoning Engine (`prompts/agents/claude-code.md`).

## 3. Development Standards

### Commands
*   **Bootstrap**: `make bootstrap`
*   **Start Dev**: `make dev` (or `npm run dev` in specific packages)
*   **Test**: `make test` (or `npm test`)
*   **Lint**: `make lint`

### Coding Style
*   **TypeScript**: Strict mode, functional patterns where possible.
*   **Comments**: JSDoc required for all public interfaces.
*   **Testing**: 100% coverage for domain logic.

### Quality Bar
*   **Zero TODOs**: Code must be complete.
*   **Green CI**: Tests must pass before PR.
*   **Docs**: Every feature must have updated documentation.

## 4. Workflow

1.  **Select Persona**: Identify the appropriate agent persona for the task.
2.  **Consult Prompts**: Refer to `prompts/workflows/` for specific procedures (e.g., Code Critic, Security Check).
3.  **Execute**: Implement changes with "Clean, Green, Stable" mindset.
4.  **Verify**: Run tests and linters.
5.  **Submit**: Create a PR with a descriptive title and body.

## 5. Governance

Governance policies are enforced by OPA (Open Policy Agent) and CI checks. Refer to `docs/GOVERNANCE.md` and `prompts/agents/enterprise-4th-order.md`.
