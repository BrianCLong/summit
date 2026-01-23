# Context Engineering Strategy

## Philosophy

We are shifting from **Prompt Engineering** (stuffing instructions into a massive system prompt) to **Context Engineering** (dynamically injecting structured state via MCP Resources).

**Why?**
- **Token Efficiency**: Agents only see what they need for the current task.
- **Deterministic State**: Context is versioned and auditable.
- **Portability**: Context sources can be swapped (e.g., Local File vs. S3) without changing the prompt.

## The Context Schema

All context injected into agents must adhere to the **Summit Context Envelope**.

```json
{
  "context_id": "ctx_12345",
  "timestamp": "2025-10-27T10:00:00Z",
  "source": "mcp://summit/governance",
  "type": "policy_bundle",
  "data": {
    // ... structured data specific to the type ...
  },
  "signature": "sha256:..."
}
```

## Standard Context Types

### 1. Governance Context
**URI**: `summit://governance/active-policy`
**Purpose**: Inject active constraints and forbidden patterns.

```json
{
  "type": "governance",
  "data": {
    "allowed_tools": ["read_file", "cypher_query"],
    "forbidden_patterns": ["rm -rf", "DROP TABLE"],
    "security_level": "high"
  }
}
```

### 2. Evidence Context
**URI**: `summit://evidence/bundle/{id}`
**Purpose**: Provide the current state of the evidence bundle being assembled.

```json
{
  "type": "evidence_bundle",
  "data": {
    "bundle_id": "ev_999",
    "artifacts": [
      {"id": "art_1", "status": "verified"},
      {"id": "art_2", "status": "pending"}
    ]
  }
}
```

### 3. Project Context
**URI**: `summit://project/current`
**Purpose**: Provide metadata about the current workspace/repository.

```json
{
  "type": "project_metadata",
  "data": {
    "repo_name": "summit",
    "branch": "feat/mcp-architecture",
    "environment": "test",
    "capabilities": ["neo4j", "postgres"]
  }
}
```

## Directory Structure (`context/`)

We will introduce a `context/` directory to manage static context blueprints and schema definitions.

```
context/
├── schemas/
│   ├── governance-v1.json
│   ├── evidence-v1.json
│   └── project-v1.json
├── static/
│   ├── base-governance.json   # Fallback governance rules
│   └── dev-environment.json   # Default dev context
└── dynamic/
    └── README.md              # Instructions on how dynamic context is Hydrated via MCP
```

## Implementation Guide

1.  **Define Schema**: Create a JSON Schema in `context/schemas/`.
2.  **Register MCP Resource**: Ensure an MCP server exposes the resource at the correct URI.
3.  **Agent Config**: Update the agent template (see `agents/templates/`) to request this resource URI.
