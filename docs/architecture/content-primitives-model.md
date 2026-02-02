# Content Primitives Model (Briefs, Claims, Blocks)

## Summit Readiness Assertion

This model operationalizes the Summit readiness baseline by making content objects traceable, policy-aware, and evidence-backed from creation to deployment. It is the canonical path to deterministic content governance and audit-ready reuse across briefs, runbooks, and decks.

## Purpose

Summit content is now governed as a small set of graph-native primitives. All briefs, runbooks, and decks are composed from the same structured objects so the system can enforce provenance, policy, and work-state alignment without bespoke templates.

## Core Entities

- **Brief**: The top-level container that anchors intent, ownership, audience, and lifecycle state.
- **Claim**: Atomic knowledge units with provenance and confidence metadata.
- **Block**: Reusable content fragments with semantic type and audience targeting.
- **WorkItemRef**: A link to live work (issue/PR/workflow) that keeps content fresh and reviewable.

## JSON Schemas

### `WorkItemRef`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/work-item-ref.json",
  "title": "WorkItemRef",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "repo", "number", "state"],
  "properties": {
    "kind": {
      "type": "string",
      "enum": ["issue", "pr", "workflow"]
    },
    "repo": {
      "type": "string",
      "minLength": 1
    },
    "number": {
      "type": "integer",
      "minimum": 1
    },
    "state": {
      "type": "string",
      "enum": ["open", "closed", "merged", "failed", "running", "queued"]
    }
  }
}
```

### `Claim`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/claim.json",
  "title": "Claim",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "text", "topic", "confidence", "last_reviewed_at", "created_by"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "text": { "type": "string", "minLength": 1 },
    "topic": { "type": "string", "minLength": 1 },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "last_reviewed_at": { "type": "string", "format": "date-time" },
    "created_by": { "type": "string", "minLength": 1 },
    "tags": { "type": "array", "items": { "type": "string" }, "default": [] },
    "policy_tags": { "type": "array", "items": { "type": "string" }, "default": [] },
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["type", "ref"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["issue", "pr", "doc", "log", "url", "dataset"]
          },
          "ref": { "type": "string", "minLength": 1 },
          "note": { "type": "string" }
        }
      },
      "default": []
    },
    "work_items": {
      "type": "array",
      "items": { "$ref": "https://summit.local/schemas/work-item-ref.json" },
      "default": []
    }
  }
}
```

### `Block`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/block.json",
  "title": "Block",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "kind", "body", "language"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "kind": {
      "type": "string",
      "enum": ["narrative", "procedure", "context", "risk", "metric"]
    },
    "body": { "type": "string", "minLength": 1 },
    "language": { "type": "string", "minLength": 2 },
    "audience": { "type": "string" },
    "related_entities": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "policy_tags": { "type": "array", "items": { "type": "string" }, "default": [] },
    "work_items": {
      "type": "array",
      "items": { "$ref": "https://summit.local/schemas/work-item-ref.json" },
      "default": []
    }
  }
}
```

### `Brief`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://summit.local/schemas/brief.json",
  "title": "Brief",
  "type": "object",
  "additionalProperties": false,
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
    "id": { "type": "string", "minLength": 1 },
    "type": {
      "type": "string",
      "enum": ["rfc", "runbook", "threat-brief", "deck"]
    },
    "status": {
      "type": "string",
      "enum": ["draft", "review", "approved", "deprecated"]
    },
    "owner": { "type": "string", "minLength": 1 },
    "audience": { "type": "string", "minLength": 1 },
    "security_level": {
      "type": "string",
      "enum": ["public", "internal", "confidential", "restricted"]
    },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" },
    "sources": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "claims": {
      "type": "array",
      "items": { "$ref": "https://summit.local/schemas/claim.json" },
      "default": []
    },
    "actions": {
      "type": "array",
      "items": { "$ref": "https://summit.local/schemas/work-item-ref.json" },
      "default": []
    },
    "blocks": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "policy_tags": { "type": "array", "items": { "type": "string" }, "default": [] }
  }
}
```

## Composition Rules

- A **Brief** references reusable **Blocks** by ID and embeds **Claims** directly for provenance traceability.
- **Claims** can be reused across briefs; retiring a claim cascades to every brief that references it.
- **Blocks** support multiple audiences and policy tags without duplication, enabling safe reuse across delivery channels.

## Governance Drift Example (Brief)

```json
{
  "id": "brief-governance-drift-001",
  "type": "runbook",
  "status": "review",
  "owner": "governance@intelgraph",
  "audience": "platform-ops",
  "security_level": "internal",
  "created_at": "2026-01-31T03:00:00Z",
  "updated_at": "2026-01-31T03:00:00Z",
  "sources": [
    "docs/ga/TESTING-STRATEGY.md",
    "docs/governance/CONSTITUTION.md",
    "docs/SUMMIT_READINESS_ASSERTION.md"
  ],
  "claims": [
    {
      "id": "claim-ga-gates-immutable",
      "text": "GA gates must not be bypassed without a governed exception record.",
      "topic": "governance",
      "confidence": 0.98,
      "last_reviewed_at": "2026-01-31T03:00:00Z",
      "created_by": "aegis",
      "tags": ["ga", "security"],
      "policy_tags": ["internal_only"],
      "evidence": [
        {
          "type": "doc",
          "ref": "docs/ga/TESTING-STRATEGY.md",
          "note": "Golden path guardrails and verification tiers."
        }
      ],
      "work_items": [{ "kind": "issue", "repo": "summit", "number": 412, "state": "open" }]
    }
  ],
  "actions": [{ "kind": "pr", "repo": "summit", "number": 1281, "state": "open" }],
  "blocks": [
    "block-governance-drift-context",
    "block-governance-drift-procedure",
    "block-governance-drift-risk"
  ],
  "policy_tags": ["internal_only", "policy_controlled"]
}
```

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection altering claims, stale evidence reuse, policy tag stripping, work item drift hiding regressions.
- **Mitigations**: Schema validation, policy tags enforced at publish time, mandatory evidence links, work item health checks, and audit trails for claim updates.

## Next Actions

- Implement claim retirement workflows with automatic brief deprecation.
- Add automated drift queries for briefs whose work items are failed or closed without resolution.
- Establish policy tag routing rules for public/private documentation targets.
