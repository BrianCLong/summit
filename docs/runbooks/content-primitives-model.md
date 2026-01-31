# Content Primitives Governance Runbook

## Purpose

Define Summit content as a small set of governed, graph-like primitives (Brief, Claim, Block) with
policy-aware metadata, evidence linkage, and work-item binding. This runbook operationalizes the
canonical model so every artifact references the same authority files and enforcement sources.

## Authority & Alignment

- **Readiness assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (authoritative readiness posture).
- **Governance sources:** `docs/governance/GOVERNANCE.md`, `docs/governance/RULEBOOK.md`,
  `docs/governance/META_GOVERNANCE.md` (policy definitions and authority hierarchy).
- **Compliance evidence index:** `COMPLIANCE_EVIDENCE_INDEX.md` (evidence catalog).
- **Policy engine:** `server/src/policies` and `server/src/receipts` are the enforceable sources of
  policy-as-code and receipt schema definitions.

## Scope

Applies to all documentation and structured content that represents requirements, operational
runbooks, threat briefs, RFCs, or decks. Any exceptions are recorded as **Governed Exceptions**
with explicit evidence and approval.

## Governance Rules (Non-Negotiable)

1. **Single source of truth:** All content is expressed as Brief/Claim/Block primitives using the
   canonical schema below.
2. **Policy tagging required:** Every primitive must include `policy_tags`; untagged objects are
   rejected.
3. **Evidence binding:** Every claim must reference evidence receipts or authoritative docs.
4. **Work item linkage:** Every brief must include active work item references that keep it true.
5. **Governed Exceptions:** Deviations are logged as **Governed Exceptions** with owner, expiration,
   and remediation work item.

## Data Model (Canonical JSON Schema)

> **Rule:** All content producers must use these primitives and field definitions. Any deviation
> is recorded as a **Governed Exception** and linked to a work item.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "summit://content/primitives.schema.json",
  "title": "Summit Content Primitives",
  "type": "object",
  "required": ["briefs", "claims", "blocks"],
  "properties": {
    "briefs": {
      "type": "array",
      "items": { "$ref": "#/$defs/Brief" }
    },
    "claims": {
      "type": "array",
      "items": { "$ref": "#/$defs/Claim" }
    },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/$defs/Block" }
    },
    "layouts": {
      "type": "array",
      "items": { "$ref": "#/$defs/DocumentLayout" }
    },
    "governed_exceptions": {
      "type": "array",
      "items": { "$ref": "#/$defs/GovernedException" }
    }
  },
  "$defs": {
    "Brief": {
      "type": "object",
      "required": [
        "id",
        "type",
        "status",
        "owner",
        "audience",
        "security_level",
        "created_at",
        "updated_at",
        "sources",
        "claims",
        "actions",
        "policy_tags"
      ],
      "properties": {
        "id": { "type": "string", "pattern": "^brief_[a-z0-9_-]+$" },
        "type": {
          "type": "string",
          "enum": ["rfc", "runbook", "threat-brief", "deck"]
        },
        "status": {
          "type": "string",
          "enum": ["draft", "review", "approved", "deprecated"]
        },
        "owner": { "type": "string" },
        "audience": { "type": "string" },
        "security_level": {
          "type": "string",
          "enum": ["public", "internal", "confidential", "restricted"]
        },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" },
        "sources": {
          "type": "array",
          "items": { "$ref": "#/$defs/SourceRef" }
        },
        "claims": {
          "type": "array",
          "items": { "$ref": "#/$defs/ClaimRef" }
        },
        "actions": {
          "type": "array",
          "items": { "$ref": "#/$defs/WorkItemRef" }
        },
        "policy_tags": {
          "type": "array",
          "items": { "$ref": "#/$defs/PolicyTag" }
        }
      }
    },
    "Claim": {
      "type": "object",
      "required": [
        "id",
        "text",
        "topic",
        "confidence",
        "last_reviewed_at",
        "created_by",
        "tags",
        "evidence",
        "policy_tags"
      ],
      "properties": {
        "id": { "type": "string", "pattern": "^claim_[a-z0-9_-]+$" },
        "text": { "type": "string" },
        "topic": { "type": "string" },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "last_reviewed_at": { "type": "string", "format": "date-time" },
        "created_by": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "evidence": {
          "type": "array",
          "items": { "$ref": "#/$defs/EvidenceRef" }
        },
        "policy_tags": {
          "type": "array",
          "items": { "$ref": "#/$defs/PolicyTag" }
        }
      }
    },
    "Block": {
      "type": "object",
      "required": [
        "id",
        "kind",
        "body",
        "language",
        "audience",
        "related_entities",
        "policy_tags"
      ],
      "properties": {
        "id": { "type": "string", "pattern": "^block_[a-z0-9_-]+$" },
        "kind": {
          "type": "string",
          "enum": ["narrative", "procedure", "context", "risk", "metric"]
        },
        "body": { "type": "string" },
        "language": { "type": "string" },
        "audience": { "type": "string" },
        "related_entities": {
          "type": "array",
          "items": { "type": "string" }
        },
        "policy_tags": {
          "type": "array",
          "items": { "$ref": "#/$defs/PolicyTag" }
        }
      }
    },
    "DocumentLayout": {
      "type": "object",
      "required": ["id", "block_ids", "layout_recipe"],
      "properties": {
        "id": { "type": "string", "pattern": "^layout_[a-z0-9_-]+$" },
        "block_ids": {
          "type": "array",
          "items": { "type": "string" }
        },
        "layout_recipe": { "type": "string" }
      }
    },
    "SourceRef": {
      "type": "object",
      "required": ["kind", "uri"],
      "properties": {
        "kind": { "type": "string", "enum": ["url", "file", "issue", "doc"] },
        "uri": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "EvidenceRef": {
      "type": "object",
      "required": ["kind", "uri"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["issue", "log", "doc", "external-url", "receipt"]
        },
        "uri": { "type": "string" },
        "notes": { "type": "string" }
      }
    },
    "ClaimRef": {
      "type": "object",
      "required": ["id", "relationship"],
      "properties": {
        "id": { "type": "string" },
        "relationship": {
          "type": "string",
          "enum": ["supports", "disputes", "supersedes"]
        }
      }
    },
    "WorkItemRef": {
      "type": "object",
      "required": ["kind", "repo", "number", "state"],
      "properties": {
        "kind": { "type": "string", "enum": ["issue", "pr", "workflow"] },
        "repo": { "type": "string" },
        "number": { "type": "integer" },
        "state": { "type": "string" }
      }
    },
    "GovernedException": {
      "type": "object",
      "required": ["id", "owner", "reason", "expires_at", "remediation"],
      "properties": {
        "id": { "type": "string", "pattern": "^exception_[a-z0-9_-]+$" },
        "owner": { "type": "string" },
        "reason": { "type": "string" },
        "expires_at": { "type": "string", "format": "date-time" },
        "remediation": { "$ref": "#/$defs/WorkItemRef" }
      }
    },
    "PolicyTag": {
      "type": "string",
      "enum": [
        "export_controlled",
        "customer_confidential",
        "internal_only",
        "public_release_blocked",
        "governed_exception"
      ]
    }
  }
}
```

## Example: Governance Drift Brief (Encoded)

```json
{
  "briefs": [
    {
      "id": "brief_governance_drift_2026q1",
      "type": "runbook",
      "status": "review",
      "owner": "Governance Council",
      "audience": "Platform Operations",
      "security_level": "internal",
      "created_at": "2026-01-15T00:00:00Z",
      "updated_at": "2026-01-15T00:00:00Z",
      "sources": [
        {
          "kind": "doc",
          "uri": "docs/governance/RULEBOOK.md",
          "description": "Canonical governance rulebook"
        },
        {
          "kind": "doc",
          "uri": "docs/governance/META_GOVERNANCE.md",
          "description": "Authority hierarchy and enforcement"
        }
      ],
      "claims": [
        { "id": "claim_governance_drift_01", "relationship": "supports" },
        { "id": "claim_governance_drift_02", "relationship": "supports" }
      ],
      "actions": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 1234,
          "state": "open"
        }
      ],
      "policy_tags": ["internal_only"]
    }
  ],
  "claims": [
    {
      "id": "claim_governance_drift_01",
      "text": "Governance requirements drift when evidence links are missing or stale.",
      "topic": "governance-drift",
      "confidence": 0.78,
      "last_reviewed_at": "2026-01-15T00:00:00Z",
      "created_by": "governance-bot",
      "tags": ["drift", "compliance"],
      "evidence": [
        {
          "kind": "doc",
          "uri": "docs/governance/GOVERNANCE.md",
          "notes": "Authority chain referenced in enforcement rules"
        },
        {
          "kind": "receipt",
          "uri": "server/src/receipts/receipt-schema.json",
          "notes": "Receipt schema binds evidence to content claims"
        }
      ],
      "policy_tags": ["internal_only"]
    },
    {
      "id": "claim_governance_drift_02",
      "text": "Work items without active state invalidate the claims they support.",
      "topic": "work-item-health",
      "confidence": 0.72,
      "last_reviewed_at": "2026-01-15T00:00:00Z",
      "created_by": "governance-bot",
      "tags": ["work-items", "health"],
      "evidence": [
        {
          "kind": "external-url",
          "uri": "https://example.internal/policies/work-item-health",
          "notes": "Policy anchor for stale work item detection"
        }
      ],
      "policy_tags": ["internal_only"]
    }
  ],
  "blocks": [
    {
      "id": "block_governance_drift_context",
      "kind": "context",
      "body": "Governance drift is detected when content claims lack active work-item or evidence links.",
      "language": "en",
      "audience": "platform-ops",
      "related_entities": ["governance-drift", "compliance"],
      "policy_tags": ["internal_only"]
    },
    {
      "id": "block_governance_drift_procedure",
      "kind": "procedure",
      "body": "1) Verify work items are active. 2) Confirm evidence receipts exist. 3) Record governed exception if evidence is missing.",
      "language": "en",
      "audience": "platform-ops",
      "related_entities": ["work-item-health", "evidence"],
      "policy_tags": ["internal_only"]
    }
  ],
  "layouts": [
    {
      "id": "layout_governance_drift_v1",
      "block_ids": [
        "block_governance_drift_context",
        "block_governance_drift_procedure"
      ],
      "layout_recipe": "context -> procedure"
    }
  ],
  "governed_exceptions": []
}
```

## Operational Procedure

1. **Model creation:** Create or update Brief/Claim/Block objects using the schema above.
2. **Policy tagging:** Apply `policy_tags` to every object. Un-tagged content is rejected.
3. **Evidence capture:**
   - Record receipts using `server/src/receipts` definitions and store outputs through
     `services/receipt-worker` pipelines.
   - Register evidence IDs in `COMPLIANCE_EVIDENCE_INDEX.md`.
4. **Work item linkage:** Attach `WorkItemRef` entries and ensure the state is current.
5. **Governed Exceptions:** If any field cannot be satisfied, log a governed exception with
   explicit owner, expiration, and remediation work item.

## Content Health Queries

- **Stale work items:** List briefs with `actions.state` not in an active state and open a
  remediation work item.
- **Missing receipts:** List claims lacking `EvidenceRef.kind = receipt` and record a governed
  exception with an expiration date.
- **Policy drift:** List any primitive without `policy_tags` and block publication.

## Policy Tag Mapping

Use the following mapping to enforce deployment placement:

- `public_release_blocked`: restricted to internal repositories and non-public storage.
- `export_controlled`: restricted to export-controlled environments with policy engine enforcement.
- `customer_confidential`: restricted to customer-specific bundles and access-controlled paths.
- `internal_only`: restricted to internal-only documentation sets.
- `governed_exception`: signals approved deviation with explicit expiration.

## Verification

- Confirm the JSON schema validates the example payload.
- Confirm evidence receipts exist for each `EvidenceRef.kind = receipt` entry.
- Confirm work items referenced are in an active state.

## Exit Criteria

- The Brief, Claim, and Block objects validate against the schema.
- All evidence receipts are recorded and indexed.
- Any exception is recorded as a **Governed Exception** with a remediation work item.
- Governance drift status is recorded as current.
