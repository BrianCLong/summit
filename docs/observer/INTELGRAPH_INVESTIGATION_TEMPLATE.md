# IntelGraph Investigation Template

> Copy this template for each investigation. Replace bracketed text with your findings.

## 1) Context & Objective

**Context:** [What triggered this investigation?]

**Objective:** [What decision or risk are you trying to inform?]

## 2) Hypotheses

- H1: [Primary hypothesis]
- H2: [Secondary hypothesis]
- H3: [Optional]

## 3) Key entities & relationships of interest

**Entities:**

- [Entity name / alias]
- [Entity type]

**Relationships to validate:**

- [Entity A] → [Relationship] → [Entity B]
- [Entity A] → [Relationship] → [Entity C]

## 4) Data sources used

**Internal sources:**

- [Dataset name / system]

**External sources (observer mode = off by default):**

- [If enabled, list explicitly]

## 5) Queries run (IntelGraph / GraphQL)

> Use the GraphQL explorer at http://localhost:4000/graphql. Adjust fields to match the schema.

**Example GraphQL snippet (entity search):**

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

**Example GraphQL snippet (relationship expansion):**

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

**Notes on actual queries run:**

- [Paste the query text or export path]

## 6) Findings & confidence

- **Finding 1:** [Summary] — Confidence: [Low/Med/High]
- **Finding 2:** [Summary] — Confidence: [Low/Med/High]

## 7) Follow-ups / monitoring

- [Next action]
- [Monitoring trigger or alert]

## 8) Brief metadata (optional)

- Investigation owner: [Name]
- Date range: [Start–End]
- Tags: [tag1, tag2]
