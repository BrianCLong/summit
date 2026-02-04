# Summit GenUI Tool Manual

This manual defines the strict input/output schema for tools referenced by UI plans. Tools are
policy-governed and must emit provenance metadata in every response.

## Standard Tool Envelope

```json
{
  "tool": "tools.graphQuery",
  "input": {
    "query": "...",
    "params": {}
  }
}
```

```json
{
  "result": {
    "data": [],
    "summary": "..."
  },
  "provenance": {
    "citations": ["cite-1"],
    "evidenceId": "EV-001",
    "timestamp": "2026-01-01T00:00:00Z"
  }
}
```

## Tool Catalog

- `tools.search` — allowlisted search with citation capture
- `tools.graphQuery` — typed graph/Neo4j adapter
- `tools.repoOps` — repo analysis with redaction and receipt logging
- `tools.validator` — policy and compliance validation
- `tools.reportGen` — report synthesis with evidence bundle emission

## Required Behavior

- All tools record provenance IDs and citation references.
- External calls are blocked unless tenant policy allows.
- Destructive actions require confirmation components.
