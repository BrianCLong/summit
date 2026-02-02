# Content Primitives: Brief, Claim, Block

## Intent

Summit content is defined as a small set of structured, graph-native primitives to replace ad-hoc
markdown artifacts. The system treats **Briefs**, **Claims**, and **Blocks** as authoritative nodes
with explicit provenance, policy tags, and work-item linkage. This ensures every artifact answers
"what it is, why it exists, and what it changes" without ambiguity.

## Readiness Alignment

This model aligns to the Summit Readiness Assertion as the governing authority for content safety
and traceability. See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness criteria that apply to
all published content primitives.

## Core Objects

### Brief

A Brief is the first-class container for structured content. It aggregates claims, sources,
actions, and layout pointers without embedding prose directly.

**Required fields**: `id`, `type`, `status`, `owner`, `audience`, `security_level`, `created_at`,
`updated_at`.

### Claim

A Claim expresses a reusable, evidence-backed statement that can be referenced by multiple briefs
and runbooks. Claims are authoritative and versioned through evidence updates.

**Required fields**: `id`, `text`, `topic`, `confidence`, `last_reviewed_at`, `created_by`.

### Block

A Block is a semantically typed content unit (e.g., procedure, risk, metric). Documents are ordered
lists of block IDs with a layout recipe.

**Required fields**: `id`, `kind`, `body`, `language`, `audience`.

## Shared Types

### WorkItemRef

Links content to live work items to prevent governance drift and stale documentation.

```json
{
  "kind": "issue",
  "repo": "summit",
  "number": 1234,
  "state": "open",
  "url": "https://github.com/org/summit/issues/1234"
}
```

### EvidenceRef

Evidence binds claims to verifiable sources.

```json
{
  "id": "evidence-001",
  "kind": "doc",
  "uri": "docs/ga/TESTING-STRATEGY.md",
  "hash": "sha256:...",
  "captured_at": "2026-02-14T00:00:00Z"
}
```

## JSON Schema (Draft 2020-12)

### Brief

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/brief.schema.json",
  "title": "Brief",
  "type": "object",
  "required": [
    "id",
    "type",
    "status",
    "owner",
    "audience",
    "security_level",
    "created_at",
    "updated_at"
  ],
  "properties": {
    "id": { "type": "string" },
    "type": {
      "type": "string",
      "enum": ["rfc", "runbook", "threat-brief", "deck", "governance"]
    },
    "status": {
      "type": "string",
      "enum": ["draft", "in-review", "approved", "deprecated", "archived"]
    },
    "owner": { "type": "string" },
    "audience": { "type": "array", "items": { "type": "string" } },
    "security_level": {
      "type": "string",
      "enum": ["public", "internal", "confidential", "restricted"]
    },
    "policy_tags": { "type": "array", "items": { "type": "string" } },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" },
    "sources": {
      "type": "array",
      "items": { "$ref": "#/definitions/source" }
    },
    "claims": {
      "type": "array",
      "items": { "type": "string", "description": "Claim IDs" }
    },
    "actions": {
      "type": "array",
      "items": { "$ref": "#/definitions/workItemRef" }
    },
    "blocks": {
      "type": "array",
      "items": { "type": "string", "description": "Block IDs" }
    },
    "layout": {
      "type": "object",
      "properties": {
        "recipe": { "type": "string" },
        "ordering": { "type": "array", "items": { "type": "string" } }
      },
      "additionalProperties": false
    },
    "related_entities": { "type": "array", "items": { "type": "string" } }
  },
  "definitions": {
    "source": {
      "type": "object",
      "required": ["kind", "uri"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["url", "file", "issue", "pr", "dataset", "log"]
        },
        "uri": { "type": "string" },
        "label": { "type": "string" }
      },
      "additionalProperties": false
    },
    "workItemRef": {
      "type": "object",
      "required": ["kind", "repo", "number", "state"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["issue", "pr", "workflow", "incident"]
        },
        "repo": { "type": "string" },
        "number": { "type": "integer" },
        "state": { "type": "string" },
        "url": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### Claim

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/claim.schema.json",
  "title": "Claim",
  "type": "object",
  "required": ["id", "text", "topic", "confidence", "last_reviewed_at", "created_by"],
  "properties": {
    "id": { "type": "string" },
    "text": { "type": "string" },
    "topic": { "type": "string" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "last_reviewed_at": { "type": "string", "format": "date-time" },
    "created_by": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "policy_tags": { "type": "array", "items": { "type": "string" } },
    "evidence": {
      "type": "array",
      "items": { "$ref": "#/definitions/evidenceRef" }
    },
    "work_items": {
      "type": "array",
      "items": { "$ref": "#/definitions/workItemRef" }
    }
  },
  "definitions": {
    "evidenceRef": {
      "type": "object",
      "required": ["id", "kind", "uri"],
      "properties": {
        "id": { "type": "string" },
        "kind": {
          "type": "string",
          "enum": ["doc", "log", "issue", "pr", "dataset", "url"]
        },
        "uri": { "type": "string" },
        "hash": { "type": "string" },
        "captured_at": { "type": "string", "format": "date-time" }
      },
      "additionalProperties": false
    },
    "workItemRef": {
      "type": "object",
      "required": ["kind", "repo", "number", "state"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["issue", "pr", "workflow", "incident"]
        },
        "repo": { "type": "string" },
        "number": { "type": "integer" },
        "state": { "type": "string" },
        "url": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### Block

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/block.schema.json",
  "title": "Block",
  "type": "object",
  "required": ["id", "kind", "body", "language", "audience"],
  "properties": {
    "id": { "type": "string" },
    "kind": {
      "type": "string",
      "enum": ["narrative", "procedure", "context", "risk", "metric"]
    },
    "body": { "type": "string" },
    "language": { "type": "string" },
    "audience": { "type": "array", "items": { "type": "string" } },
    "policy_tags": { "type": "array", "items": { "type": "string" } },
    "related_entities": { "type": "array", "items": { "type": "string" } },
    "work_items": {
      "type": "array",
      "items": { "$ref": "#/definitions/workItemRef" }
    }
  },
  "definitions": {
    "workItemRef": {
      "type": "object",
      "required": ["kind", "repo", "number", "state"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["issue", "pr", "workflow", "incident"]
        },
        "repo": { "type": "string" },
        "number": { "type": "integer" },
        "state": { "type": "string" },
        "url": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## Policy-aware Content Placement

Policy tags control where content can live. Example mapping:

- `export_controlled` → restricted branches + private environments only.
- `customer_confidential` → customer bundle only, no public docs.
- `internal_only` → private wiki or private repo.

## Example: Governance Drift Brief (Encoded)

```json
{
  "brief": {
    "id": "brief-governance-drift-001",
    "type": "governance",
    "status": "in-review",
    "owner": "Governance Team",
    "audience": ["compliance", "engineering", "release"],
    "security_level": "confidential",
    "policy_tags": ["internal_only", "customer_confidential"],
    "created_at": "2026-02-14T00:00:00Z",
    "updated_at": "2026-02-14T00:00:00Z",
    "sources": [
      {
        "kind": "file",
        "uri": "docs/ga/TESTING-STRATEGY.md",
        "label": "Golden path requirements"
      },
      {
        "kind": "file",
        "uri": "docs/ga/LEGACY-MODE.md",
        "label": "Legacy mode guardrails"
      }
    ],
    "claims": ["claim-ga-gate-failures", "claim-stale-runbooks"],
    "actions": [
      {
        "kind": "issue",
        "repo": "summit",
        "number": 4321,
        "state": "open",
        "url": "https://github.com/org/summit/issues/4321"
      }
    ],
    "blocks": ["block-risk-001", "block-procedure-001"],
    "layout": {
      "recipe": "brief:governance:v1",
      "ordering": ["block-risk-001", "block-procedure-001"]
    },
    "related_entities": ["PolicyEngine", "GoldenPath"]
  },
  "claims": [
    {
      "id": "claim-ga-gate-failures",
      "text": "Required checks are intermittently failing due to missing evidence bundle metadata.",
      "topic": "governance-drift",
      "confidence": 0.72,
      "last_reviewed_at": "2026-02-14T00:00:00Z",
      "created_by": "release-captain",
      "tags": ["ci", "evidence"],
      "policy_tags": ["internal_only"],
      "evidence": [
        {
          "id": "evidence-ci-001",
          "kind": "doc",
          "uri": "docs/CI_STANDARDS.md",
          "hash": "sha256:placeholder",
          "captured_at": "2026-02-14T00:00:00Z"
        }
      ],
      "work_items": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 4321,
          "state": "open",
          "url": "https://github.com/org/summit/issues/4321"
        }
      ]
    },
    {
      "id": "claim-stale-runbooks",
      "text": "Runbook ownership metadata is missing from 4 critical procedures.",
      "topic": "governance-drift",
      "confidence": 0.68,
      "last_reviewed_at": "2026-02-14T00:00:00Z",
      "created_by": "compliance-auditor",
      "tags": ["runbook", "ownership"],
      "policy_tags": ["internal_only"],
      "evidence": [
        {
          "id": "evidence-runbook-001",
          "kind": "doc",
          "uri": "docs/ga/TESTING-STRATEGY.md",
          "hash": "sha256:placeholder",
          "captured_at": "2026-02-14T00:00:00Z"
        }
      ],
      "work_items": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 4987,
          "state": "open",
          "url": "https://github.com/org/summit/issues/4987"
        }
      ]
    }
  ],
  "blocks": [
    {
      "id": "block-risk-001",
      "kind": "risk",
      "body": "CI evidence gaps can block GA promotion and delay release windows.",
      "language": "en",
      "audience": ["release", "compliance"],
      "policy_tags": ["internal_only"],
      "related_entities": ["pr-quality-gate"],
      "work_items": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 4321,
          "state": "open",
          "url": "https://github.com/org/summit/issues/4321"
        }
      ]
    },
    {
      "id": "block-procedure-001",
      "kind": "procedure",
      "body": "Validate evidence bundles in PRs; block merge if metadata is missing.",
      "language": "en",
      "audience": ["engineering", "release"],
      "policy_tags": ["internal_only"],
      "related_entities": ["evidence-bundle"],
      "work_items": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 4321,
          "state": "open",
          "url": "https://github.com/org/summit/issues/4321"
        }
      ]
    }
  ]
}
```

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: goal manipulation via ambiguous content, provenance spoofing, stale
  evidence injection, and policy tag tampering.
- **Mitigations**: enforce evidence hashes, require work-item linkage, policy-tag gating at write
  time, and audit logging for every content update.

## Forward-Leaning Enhancement

Introduce an **Evidence Budget** validator that enforces deterministic ordering for claim evidence
lists and caps evidence fan-out per brief. This reduces traversal risk and ensures consistent
summaries across agents and releases.
