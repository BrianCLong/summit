# Playbook: Converting REST APIs to Agent-First MCP Tools

This playbook provides a step-by-step method for migrating existing legacy APIs into high-performance, moated Summit MCP tools.

## The Migration Method

1. **Identify Top User Intents**: Analyze logs or user stories to find the most common *outcomes* users want, not just the endpoints they hit.
2. **Map to Outcome Tools**: Group multiple endpoints into a single tool that accomplishes the intent.
3. **Collapse State Orchestration**: Move "if-this-then-that" logic from the LLM prompt into the MCP server code.
4. **Flatten Arguments**: Convert nested JSON request bodies into flat, typed primitives with narrow Enums and sane defaults.
5. **Implement Progressive Disclosure**: Design the response to provide a high-level summary first, with IDs for follow-up "detail" calls.
6. **Add Actionable Errors**: Replace generic `400 Bad Request` with `Error: 'target_id' is missing. You can find the target_id by calling 'service_list_resources'.`

---

## Concrete Transformation Examples

### Example 1: Search + Read + Summarize (Intelligence Gathering)

**Before (REST Primitives):**
1. `GET /api/v1/search?q=topic` -> Returns 100 results.
2. `GET /api/v1/document/{id}` (called 5 times by LLM) -> Returns full text.
3. LLM summarizes in context.
*Problem: High token usage, slow, LLM might miss key details.*

**After (Summit Outcome Tool):**
`intel_research_topic(query: string, limit: number = 5)`
- **Internal Logic**: Searches, scores results by relevance, fetches top 5 documents, and generates a structured brief.
- **Return**: A `research_brief` object with key findings and `source_ids` for deeper dives.

---

### Example 2: Create + Update (Resource Provisioning)

**Before (REST Primitives):**
1. `POST /api/v1/projects` -> `{ "id": "p1" }`
2. `POST /api/v1/projects/p1/members` (called 3 times)
3. `PATCH /api/v1/projects/p1` -> set status to "active"
*Problem: Brittle, many round-trips, LLM often forgets the 3rd step.*

**After (Summit Outcome Tool):**
`project_setup_workspace(name: string, members: string[], visibility: "public" | "private" = "private")`
- **Internal Logic**: Atomically creates the project, adds members, and sets initial configuration.
- **Return**: `{ "project_id": "p1", "status": "active", "access_url": "..." }`

---

### Example 3: Audit Large Datasets (Governance & Compliance)

**Before (REST Primitives):**
1. `GET /api/v1/audit-logs` -> Returns massive JSON array.
*Problem: Hits context limit immediately; LLM tries to process 1MB of JSON.*

**After (Summit Outcome Tool):**
`governance_list_audit_logs(filter_type?: string, limit: number = 20, offset: number = 0)`
- **Internal Logic**: Paginates at the DB level; adds a `_summit_meta` size estimate.
- **Return Envelope**:
```json
{
  "logs": [...],
  "pagination": {
    "has_more": true,
    "next_offset": 20,
    "total_count": 450
  },
  "_summit_meta": {
    "size_estimate": "2.4KB",
    "recommendation": "The list contains 450 items. Use 'filter_type' to narrow down if searching for specific events."
  }
}
```

---

## Best Practices for "Agent-First" Design

- **Enums are your friend**: Use `literal unions` (TypeScript) or `Enum` (Python) to restrict agent choices.
- **Defaults prevent hallucinations**: Always provide sane defaults so the agent doesn't have to guess.
- **IDs are the glue**: Every entity should have a clear, string-based ID returned.
- **Context Awareness**: If the response is likely to exceed 10k tokens, provide a summary and a "fetch_more" mechanism.
