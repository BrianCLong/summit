# Contributing to Summit

> **For AI Agents:** See [`CLAUDE.md`](CLAUDE.md) for deep architectural context and memory access.

## 1. The Golden Path

We follow a strict "Golden Path" philosophy. A healthy environment is one that passes the **Golden Path Smoke Test**.

1.  **Bootstrap:** `make bootstrap`
2.  **Start:** `make up`
3.  **Verify:** `make smoke`

*Do not submit PRs if `make smoke` fails.*

## 2. Development Standards

### 2.1 Branching Strategy
*   **Feature:** `feat/component/name` (e.g., `feat/search/vector-index`)
*   **Fix:** `fix/component/issue` (e.g., `fix/auth/token-refresh`)
*   **Docs:** `docs/topic` (e.g., `docs/onboarding/update`)
*   **Agents:** `agent-name/session-id` (e.g., `jules/oct-25-update`)

### 2.2 Commit Messages
We enforce [Conventional Commits](https://www.conventionalcommits.org/):
*   `feat`: New functionality.
*   `fix`: Bug resolution.
*   `docs`: Documentation only.
*   `chore`: Tooling, dependencies, or maintenance.
*   `refactor`: Code restructuring without behavioral change.

**Example:** `feat(api): implement rate limiting for public endpoints`

### 2.3 Pull Requests
*   **Title:** Matches conventional commit format.
*   **Body:** Must explain the *context*, the *change*, and the *verification* steps.
*   **Review:** All PRs require review. Self-merging is restricted to administrators.

## 3. AI Agent Collaboration

Summit is an AI-native repository. Agents (Jules, Claude, Codex) are first-class contributors.

### 3.1 Agent Protocols
*   **Isolation:** Work on dedicated branches.
*   **Verification:** Always run `make smoke` before declaring success.
*   **Documentation:** Update docs immediately when behavior changes.
*   **Handoff:** Leave clear `TODO` markers and context for the next agent.

### 3.2 Code Generation Rules
*   **Types:** Strict TypeScript usage. No `any`.
*   **Tests:** Generate unit tests for all new functions.
*   **Comments:** Explain complex logic ("why", not "what").
*   **Security:** Sanitize inputs, enforce RBAC, never hardcode secrets.

## 4. Testing Guidelines

*   **Unit Tests:** Jest. Fast, isolated.
*   **Integration Tests:** Jest + Supertest. Verify DB/API interactions.
*   **E2E Tests:** Playwright. Verify the full user journey.

## 5. Getting Help

*   **Architecture:** See `docs/README.md`.
*   **API:** See `docs/api/README.md`.
*   **Issues:** Check GitHub Issues for active tasks.

---
*Build with quality. Document with pride.*
