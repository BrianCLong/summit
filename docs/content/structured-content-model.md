# Structured Content Model: Briefs, Claims, Blocks

**Readiness anchor:** All content modeling work aligns to the Summit Readiness Assertion and its definition of readiness evidence and authoritative artifacts.【docs/SUMMIT_READINESS_ASSERTION.md】

## Present state and mandated direction

Summit content is now defined by a single set of graph primitives—**Brief**, **Claim**, and **Block**—so every artifact is grounded in evidence, governance, and actionable work links. This eliminates bespoke templates and forces aligned definitions across the ecosystem.

## Authority files (single source of truth)

- Schema: `schemas/content/brief.schema.json`
- Schema: `schemas/content/claim.schema.json`
- Schema: `schemas/content/block.schema.json`

All new artifacts must use these schemas. Legacy or bespoke formats are treated as **Governed Exceptions** and must be re-ingested into these primitives before any new distribution.

## Core model overview

### Brief

A Brief is the top-level object that binds sources, claims, actions, and assembly layout.

**Fields**

- `id`, `type`, `status`, `owner`, `audience`, `security_level`, `created_at`, `updated_at`
- `sources[]`: URLs, files, issues, docs
- `claims[]`: embedded claim objects with evidence
- `actions[]`: work items (issues/PRs/workflows)
- `blocks[]`: ordered block references
- `policy_tags[]`: policy routing

### Claim

A Claim is the reusable knowledge unit with evidence and explicit confidence.

**Fields**

- `id`, `text`, `topic`, `confidence`, `last_reviewed_at`, `created_by`, `tags[]`
- `evidence[]`: citations to issues, logs, docs, external URLs
- `policy_tags[]`: policy routing
- `work_items[]`: live work links tied to claim validity

### Block

A Block is a semantic content unit (narrative, procedure, context, risk, metric) that can be reused across documents.

**Fields**

- `id`, `kind`, `body`, `language`, `audience`, `related_entities[]`
- `policy_tags[]`, `claim_ids[]`, `work_items[]`

## Governance alignment

- **Policy-aware routing** is enforced via `policy_tags` on briefs, claims, and blocks.
- **Work item linkage** is required through `work_items` and brief `actions`, enabling drift detection and auto-review triggers.
- **Evidence-first** is enforced by mandatory `evidence` on every claim.

## MAESTRO security alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered:** prompt injection into content generation, evidence tampering, policy bypass via untagged content
- **Mitigations:** schema-level evidence requirements, policy tags on all content primitives, and work-item links to enforce re-review gates

## Example: Governance Drift Brief (encoded)

```json
{
  "id": "brief-governance-drift-2026-01",
  "type": "runbook",
  "status": "in-review",
  "owner": "governance-team",
  "audience": ["security", "compliance", "platform"],
  "security_level": "internal",
  "created_at": "2026-01-31T00:00:00Z",
  "updated_at": "2026-01-31T00:00:00Z",
  "sources": [
    {
      "kind": "doc",
      "uri": "docs/governance/CONSTITUTION.md",
      "title": "Constitution of the Ecosystem"
    },
    {
      "kind": "doc",
      "uri": "docs/SUMMIT_READINESS_ASSERTION.md",
      "title": "Summit Readiness Assertion"
    }
  ],
  "claims": [
    {
      "id": "claim-governance-drift-001",
      "text": "Governance drift is defined as a divergence between authoritative policy files and the content artifacts that claim alignment.",
      "topic": "governance",
      "confidence": 0.92,
      "last_reviewed_at": "2026-01-31T00:00:00Z",
      "created_by": "governance-team",
      "tags": ["definition", "drift"],
      "policy_tags": ["internal_only"],
      "evidence": [
        {
          "id": "evidence-constitution-001",
          "kind": "doc",
          "uri": "docs/governance/CONSTITUTION.md",
          "description": "Policy authority file defining governance baseline.",
          "captured_at": "2026-01-31T00:00:00Z"
        }
      ],
      "work_items": [
        {
          "kind": "issue",
          "repo": "summit",
          "number": 4102,
          "state": "open",
          "url": "https://example.com/summit/issues/4102"
        }
      ]
    }
  ],
  "actions": [
    {
      "kind": "workflow",
      "repo": "summit",
      "number": 901,
      "state": "queued",
      "url": "https://example.com/summit/actions/901"
    }
  ],
  "blocks": [
    {
      "block_id": "block-governance-drift-001",
      "order": 1,
      "layout": "summary"
    },
    {
      "block_id": "block-governance-drift-002",
      "order": 2,
      "layout": "procedure"
    }
  ],
  "policy_tags": ["internal_only"],
  "work_items": [
    {
      "kind": "issue",
      "repo": "summit",
      "number": 4102,
      "state": "open",
      "url": "https://example.com/summit/issues/4102"
    }
  ]
}
```

## Blocks referenced in the example

```json
[
  {
    "id": "block-governance-drift-001",
    "kind": "context",
    "body": "Governance drift is detected when policy authority files and operational content diverge. All affected briefs enter in-review status until evidence is revalidated.",
    "language": "en",
    "audience": ["security", "compliance"],
    "related_entities": ["policy-engine", "evidence-gate"],
    "policy_tags": ["internal_only"],
    "claim_ids": ["claim-governance-drift-001"],
    "work_items": [
      {
        "kind": "issue",
        "repo": "summit",
        "number": 4102,
        "state": "open",
        "url": "https://example.com/summit/issues/4102"
      }
    ]
  },
  {
    "id": "block-governance-drift-002",
    "kind": "procedure",
    "body": "Run governance drift checks, verify policy tags, and re-issue evidence stamps. Content without evidence is quarantined.",
    "language": "en",
    "audience": ["security", "platform"],
    "related_entities": ["evidence-stamp", "policy-tags"],
    "policy_tags": ["internal_only"],
    "claim_ids": ["claim-governance-drift-001"],
    "work_items": [
      {
        "kind": "workflow",
        "repo": "summit",
        "number": 901,
        "state": "queued",
        "url": "https://example.com/summit/actions/901"
      }
    ]
  }
]
```

## Content health queries (examples)

- List briefs whose work items are not green:
  - `brief.actions[].state != "closed" && brief.actions[].state != "success"`
- List claims due for review:
  - `claim.last_reviewed_at < now() - 90d`
- List blocks that cite deprecated claims:
  - `block.claim_ids[] in claims where claim.status == "deprecated"`

## Forward-leaning enhancement

Introduce an **evidence budget** allocator that caps the number of claims per brief based on policy tags and evidence freshness, enabling deterministic content assembly and reducing governance review latency.

## References

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `schemas/content/brief.schema.json`
- `schemas/content/claim.schema.json`
- `schemas/content/block.schema.json`
