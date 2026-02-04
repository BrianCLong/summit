# Summit MCP Server "Golden Path" Specification

This document defines the technical standards for building and deploying MCP (Model Context Protocol) servers within the Summit/IntelGraph ecosystem. These standards ensure that MCP servers are not merely REST wrappers, but effective "User Interfaces for Agents."

## Core Principles

1. **MCP is an Agent UI**: Design for how an LLM perceives and uses the tool, not how a human developer calls an API.
2. **Outcomes over Operations**: A tool should represent a completed user intent (e.g., `github_create_and_link_pr`) rather than a raw primitive (`github_post_pull_request`).
3. **Flat, Typed Arguments**: Use flat primitive types (string, number, boolean, enum). Avoid nested objects (`dict/Record`) which increase complexity and hallucination risk for agents.
4. **Docstrings + Errors as Instructions**: The agent reads descriptions and error messages to understand context and correct its behavior.
5. **Ruthless Curation**: Keep the tool surface area small (target **5–15 tools** per server). Split by persona (e.g., `admin_*` vs `user_*`) into separate servers or namespaces.
6. **Discoverable Naming**: Use the pattern `{service}_{action}_{resource}` (e.g., `linear_create_issue`).
7. **Pagination by Default**: Any list-returning tool must support `limit` and `offset` (or cursors) and return metadata (`has_more`, `total_count`).
8. **Skills + MCP are Complementary**: Skills teach workflow/disclosure; MCP provides structured typed interfaces.

## Definitions

| Concept | Summit Definition | Example |
| :--- | :--- | :--- |
| **Tool** | An executable action that produces a side-effect or performs an outcome-oriented query. | `slack_send_message`, `postgres_execute_query` |
| **Resource** | A stateful entity or data stream that the agent can read. | `git_repo_config`, `system_logs_stream` |
| **Prompt** | A reusable instruction template that guides the agent on how to use tools for a specific workflow. | `debug_production_incident`, `generate_release_notes` |

## Outcome Tool Design Rubric

When designing a tool, ask:
- Can this tool collapse 3 or more REST calls into one?
- Does it return the exact ID needed for the *next* logical step?
- Does it handle state orchestration internally?

**Decision Rubric:**
- **Operation (Avoid)**: `create_user`, `add_user_to_group`, `set_user_permissions`.
- **Outcome (Prefer)**: `provision_new_team_member` (handles all 3).

## Response-Shaping Policy

1. **Omit the Noise**: Remove metadata headers, audit timestamps (unless requested), and internal tracking IDs.
2. **Summarize by Default**: If a resource is large, return a summary and a follow-up tool to "fetch_details".
3. **Actionable IDs**: Always return unique identifiers for entities so the agent can reference them in subsequent tool calls.

## Summit-Specific Moats

### 1. Context-Budget Awareness
Every tool response should include a `_summit_meta` block (stripped by the client before final delivery if needed, but useful for the agent):
- `size_estimate`: Rough character count or row count.
- `recommendation`: "summarize", "fetch_more", or "proceed".

### 2. Persona Partitioning
Enforce strict separation between administrative and user-facing tools.
- `admin_v1_server`: Contains destructive or high-privilege tools.
- `user_v1_server`: Contains read-only or low-impact tools.

### 3. Safety & Governance Tags
Tools must be tagged with metadata:
- `pii`: True if the tool handles sensitive personal data.
- `destructive`: True if the tool deletes or irreversibly modifies data.
- `external`: True if the tool calls a 3rd party service.
- `write`: True if the tool performs a mutation.

### 4. Outcome-Tool Composer
A pattern where a "macro tool" internally calls other MCP services or internal APIs and returns one clean outcome. This is the core competitive advantage of Summit MCP.

### 5. Tool Documentation as Training Data
Docstrings are versioned and used to generate "Tool Cards" that include positive and negative examples of tool usage.
