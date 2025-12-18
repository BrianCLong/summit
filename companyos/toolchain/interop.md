# Toolchain Interoperability

This document defines how the Agent Mesh interacts with external tools.

## 1. Interaction Patterns

### Git & Version Control
*   **Pattern**: Agents act as distinct Git users (e.g., `agent-mc-arch`).
*   **Rule**: Agents NEVER push directly to `main`. They must open PRs.
*   **Rule**: PRs must include a summary of changes, linked issues, and test evidence.
*   **Tooling**: Use `gh` CLI for PR creation and management.

### CI/CD (GitHub Actions)
*   **Pattern**: Agents interact with CI via configuration files (`.github/workflows/`) and by parsing build logs.
*   **Rule**: Agents must respect CI results. Red build = Stop and Fix.
*   **Rule**: Do not edit pipeline configs without a specific "Infra" task assignment.

### LLM CLIs (Analysis & Gen)
*   **Pattern**: Agents use available LLM CLIs for "Thinking" steps (e.g., analyzing a log file).
*   **Rule**: Do not send PII or Secrets to external LLM APIs. Sanitize local contexts first.
*   **Tooling**: `llm`, `chatgpt-cli`, or internal wrappers.

### Research (Browser Automation)
*   **Pattern**: Agents like `AUR-TEAM` use browser automation to search for Prior Art.
*   **Rule**: All external sources must be cited and stored in IntelGraph (Provenance).
*   **Tooling**: Headless browsers (Playwright/Puppeteer) wrapped in safe sandboxes.

## 2. Agent -> Tool Mapping

| Agent | Primary Tools | Permissions |
| :--- | :--- | :--- |
| **MC-ARCH** | `kubectl`, `helm`, `gh`, `terraform` | Infra Read/Write (Staging), Read (Prod) |
| **IG-ARCH** | `cypher-shell`, `psql` | DB Schema Admin |
| **SEC-DEF** | `trivy`, `semgrep`, `wireshark` | Security Audit, Log Access |
| **PX-UX** | `npm`, `playwright` | Frontend Build, E2E Test |
| **GOV-STEWARD** | `opa`, `cosign` | Policy Admin, Artifact Signing |

## 3. IDE Setup Recommendations
*   **VS Code**: Recommended for all human-in-the-loop work.
*   **Extensions**:
    *   `ESLint` / `Prettier` (Code quality)
    *   `GitLens` (History)
    *   `Open Policy Agent` (Rego highlighting)
    *   `Maestro VSCode` (Task graph visualizer - *Future*)
