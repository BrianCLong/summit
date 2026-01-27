# Acceptance Checklist: Summit MCP Infrastructure

Use this checklist to verify the implementation of the Summit MCP Server "Golden Path".

- [x] **Tool Count Target Met**: Linter enforces target of 5-15 tools per server.
- [x] **Naming Pattern Compliance**: Linter enforces `{service}_{action}_{resource}` naming.
- [x] **Flat Typed Args Everywhere**: Linter blocks nested objects in tool arguments.
- [x] **Pagination Envelope Present**: Standard `PaginationSchema` provided in scaffold; linter enforces presence for list tools.
- [x] **Docstring + Error Guidance Quality**: Linter validates mandatory docstring sections; linter encourages actionable error strings.
- [x] **Example Transformations Included**: 3 concrete "before/after" examples provided in `CONVERSION_PLAYBOOK.md`.
- [x] **CI Linter Enforceable**: `scripts/ci/lint-mcp-ux.mjs` integrated into `.github/workflows/ci-verify.yml` as a blocking gate.
- [x] **Telemetry & Governance**: Scaffold includes automatic logging of latency/payload and policy evaluation hooks.
- [x] **Summit Moats**: `_summit_meta` context-budget awareness implemented in types and scaffold.
