# Summit MCP Server Platform Prompt (v1)

Implement a Summit MCP Server Platform that is token-efficient, secure-by-default, transport-flexible, and future-proof. It must support progressive tool disclosure, skills-as-documentation, a reason+act execution loop, and dual transports (STDIO + SSE) with Summit-grade moats: policy-gated tool execution, provenance-first evidence bundles, deterministic schema evolution, and proactive toolchain retrieval.

## Non-negotiables

- No direct commits to main; work on a feature branch.
- Keep the change set focused on a coherent vertical slice.
- Avoid heavy dependencies; use existing repo conventions.
- Treat all tool inputs as untrusted: strict validation and allowlists.
- Every execution is auditable with trace IDs and evidence exports.
- Deterministic behavior: stable ordering, stable schemas, reproducible tests.

## Implementation scope

1. Create `mcp/summit_server/` with:
   - core server
   - tool registry
   - skill registry
   - policy gate
   - sanitization
   - audit + evidence writer
   - transports: stdio + sse
2. Add minimum viable tools:
   - list_capabilities
   - get_tool_schema
   - get_skill_toc / get_skill_section
   - run_query_readonly
   - export_evidence
3. Tests:
   - policy deny-by-default
   - schema validation rejects unknown fields
   - sanitization removes injection-like strings
   - progressive disclosure index omits full schemas
   - stdio integration
   - sse ordering
   - deterministic tool index snapshot
4. Docs:
   - `docs/mcp-server.md` with progressive disclosure, skills, policy gating, evidence export
5. Evidence:
   - Include an example evidence bundle in fixtures

## Acceptance criteria

- Lightweight tool index without schemas
- JIT schema retrieval with version/hash
- Policy-gated, validated, sanitized tool execution
- Evidence bundle export with checksums
- Shared logic for stdio and sse
- Tests cover both transports and determinism
