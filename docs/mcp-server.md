# Summit MCP Server Platform (Vertical Slice)

## Readiness alignment

This implementation aligns with the Summit Readiness Assertion to ensure policy-gated, provenance-first delivery for MCP capabilities.

## Progressive disclosure

- **Stage A (index):** `list_capabilities` returns a lightweight tool index and skill index without full schemas.
- **Stage B (JIT schema):** `get_tool_schema` returns full schemas on-demand with a stable schema hash for caching.

## Skills as documentation

Skill modules live under `skills/mcp/` with scoped SKILL.md files for:

- Auth & scopes
- Policy gating
- Evidence & provenance
- Transport requirements

Use `get_skill_toc` and `get_skill_section` to load documentation incrementally.

## ReAct execution loop

The server supports a structured plan→act→observe loop via `react` requests:

- **Plan:** Optional structured steps.
- **Act:** Bounded tool invocations with policy gating and input validation.
- **Observe:** Normalized results with safe follow-up suggestions when results are empty.

## Security & governance defaults

- Strict zod schemas reject unknown fields and enforce max lengths.
- Tool execution is policy-gated with deny-by-default for missing scopes.
- Output sanitization strips injection-like directives before returning results.
- Each request and tool invocation emits structured audit events with trace IDs.

## Evidence bundles

`export_evidence` returns a deterministic evidence bundle:

- `manifest` with hashes
- `steps` event list
- `toolSchemasUsed`
- `policyDecisions`
- `checksums`

## Dual transport support

- **STDIO:** Line-delimited JSON for local/IDE integration.
- **SSE:** Ordered events with explicit max-byte enforcement per event.

## Adding tools

1. Add a tool definition with zod schemas in `mcp/summit_server/src/tools/builtin-tools.ts`.
2. Declare risk tier, required scopes, and schema version.
3. Update tests and snapshots in `tests/mcp/`.

## Adding skills

1. Create `skills/mcp/<domain>/SKILL.md` with required sections.
2. Register the skill in `SkillsRegistry`.
3. Update `skills/README.md`.

## Policy gating

Policy rules are defined in `mcp/summit_server/src/policy/policies.json`. Update the allowlist and scopes there and keep the decision log deterministic.

## Evidence export workflow

1. Run tool calls under a session.
2. Invoke `export_evidence` with the session ID.
3. Store the resulting JSON bundle in `fixtures/` or an evidence archive.
