# Content Primitives: Briefs, Claims, and Blocks

This specification defines a governed content model that treats briefs, claims, and blocks as
first-class graph primitives with explicit provenance. It is aligned with the Summit Readiness
Assertion and enforces policy-aware content handling by default. All content assets must carry
policy tags and work-item links to keep governance evidence current.

## Objectives

- Consolidate content into a single Brief object with attachable sources, claims, actions, and
  ordered blocks.
- Represent knowledge as claim-evidence nodes so evidence changes can retire or refresh claims.
- Reuse content blocks across briefs and runbooks without copy/paste divergence.
- Link every content asset to live work items to drive governance drift checks.
- Embed policy tags and security levels to gate publication targets.

## JSON Schemas

Schemas live in `schemas/content/` and are intended for storage and validation.

- `content-common.schema.json`: shared types (IDs, timestamps, policy tags, work items, evidence).
- `claim.schema.json`: claim nodes with evidence and governance metadata.
- `block.schema.json`: reusable content blocks with semantic kinds and policy tags.
- `brief.schema.json`: the brief container with sources, claims, blocks, and layout order.

## Example: Governance Drift Brief

A concrete example is stored at:

- `schemas/content/examples/governance-drift-brief.json`

This brief encodes claims with evidence and ordered blocks, enabling safe reuse across contexts.

## Work Item Linkage

Every Brief, Claim, and Block includes `work_items` and/or `actions` to keep artifacts tied to live
issues, PRs, or workflows. This enables queries such as:

- “List briefs whose linked workflows failed in the last 48 hours.”
- “Show claims whose evidence sources are stale or closed without resolution.”

## Policy-Aware Content Routing

Policy tags (e.g., `export_controlled`, `customer_confidential`, `internal_only`) plus
`security_level` determine where content may be stored and which environments can render it. This
policy-first model keeps publication pathways deterministic and audit-ready.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection into content blocks, evidence spoofing, governance drift
  via stale work items, and policy tag downgrades.
- **Mitigations**: evidence references require checksums/timestamps, policy tags are mandatory on
  all primitives, work item linkage enables drift detection, and layouts are deterministic via
  explicit block order.

## Forward-Leaning Enhancement (Governed)

Introduce an automated “claim revalidation queue” that re-checks evidence sources on a schedule
and marks claims as `review-required` when evidence metadata changes. This expands the content
graph into a living governance loop without weakening existing controls.
