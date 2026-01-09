# Scenario: Competitive Landscape Signal Mapping

## Narrative

You are analyzing **Company Orion** and its influence network in the **autonomous systems** sector. Your goal is to map key partners, suppliers, and competitive signals to inform a short briefing.

## Data sources (local fixtures only)

- `GOLDEN/datasets/sum_news.jsonl` (OSINT-style summaries)

> Observer mode uses local fixture data. External connectors are intentionally constrained.

## Step-by-step investigation

### 1) Open the IntelGraph workspace

- UI: http://localhost:3000
- Confirm the GraphQL API is reachable: http://localhost:4000/graphql

### 2) Seed your working notes

Open `docs/observer/INTELGRAPH_INVESTIGATION_TEMPLATE.md` and save a copy as:

- `docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md`

### 3) Run guided queries

Use the GraphQL explorer and capture key results in your template.

**Query A: Find entities related to Company Orion**

```graphql
query EntitySearch($term: String!) {
  entities(search: $term) {
    id
    name
    type
    confidence
  }
}
```

Variables:

```json
{ "term": "Orion" }
```

**Query B: Expand relationships from a target entity**

```graphql
query EntityRelationships($id: ID!) {
  entity(id: $id) {
    id
    name
    relationships {
      type
      target {
        id
        name
        type
      }
    }
  }
}
```

Variables:

```json
{ "id": "<paste-entity-id>" }
```

Capture the top 3 relationships into the investigation template.

### 4) Summarize findings

In your investigation template, summarize:

- The most connected partners.
- Any surprising overlaps between suppliers and competitors.
- Confidence level based on the fixture data.

### 5) Export the brief

```bash
node scripts/observer/export_brief.mjs docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md \
  --dataset-id GOLDEN/datasets/sum_news.jsonl \
  --tag competitive-landscape
```

The brief will be written to `artifacts/observer/briefs/`.
