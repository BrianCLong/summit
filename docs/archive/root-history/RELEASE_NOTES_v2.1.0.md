# Release Notes: v2.1.0 - Hardening & Resilience

This release focuses on improving the overall security, resilience, and health of the Maestro Conductor platform.

## ✨ Highlights

- **Chaos Engineering Framework**: Introduced LitmusChaos for proactive resilience testing. A sample `pod-delete` experiment has been added to `tests/chaos/` along with a workflow to trigger it against staging environments.

- **Static Application Security Testing (SAST)**: Integrated `Semgrep` into the primary CI pipeline (`ci-guarded-rail.yml`) to detect potential security vulnerabilities in code during pull requests. The baseline configuration is located at `.semgrep.yml`.

- **Technical Debt Resolution**: Addressed several `TODO` markers in the codebase by replacing them with functional, mock implementations in core services like `gateway/src/index.ts` and `server/server.ts`.

- **Repository Health**: Updated deprecated `husky` git hooks to ensure future compatibility and remove persistent warnings from CI logs.
