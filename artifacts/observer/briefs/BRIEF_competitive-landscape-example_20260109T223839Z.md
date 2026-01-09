# IntelGraph Observer Brief

Generated: 2026-01-09T22:38:39.864Z
Source: docs/observer/scenarios/INVESTIGATION_competitive_landscape_brief.md
Dataset IDs: GOLDEN/datasets/sum_news.jsonl
Git SHA: 6bb2e0f68e7bcdd96e5ffc114429f57f98938acd
Tags: observer, competitive-landscape

# IntelGraph Investigation Brief - Competitive Landscape

## 1) Context & Objective

**Context:** Initial OSINT sweep for Company Orion shows multiple partnerships in autonomous systems.

**Objective:** Map the highest-impact relationships and identify competitive overlaps for a shareable brief.

## 2) Hypotheses

- H1: Company Orion is partnering with multiple mid-tier suppliers that also serve its main competitor.
- H2: A small cluster of research labs act as hubs in the autonomous systems ecosystem.

## 3) Key entities & relationships of interest

**Entities:**

- Company Orion (Company)
- Helios Labs (Research Lab)
- Vectorline Systems (Supplier)

**Relationships to validate:**

- Company Orion → partners_with → Vectorline Systems
- Company Orion → funds → Helios Labs

## 4) Data sources used

**Internal sources:**

- GOLDEN/datasets/sum_news.jsonl

**External sources (observer mode = off by default):**

- None

## 5) Queries run (IntelGraph / GraphQL)

**Entity Search (Orion):**

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

**Relationship Expansion:**

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

- EntitySearch("Orion") returned 4 entities; prioritized Company Orion and Vectorline Systems.
- Relationship expansion on Company Orion produced 6 relationships; captured top 3 by confidence.

## 6) Findings & confidence

- **Finding 1:** Company Orion shows direct partnerships with Vectorline Systems and shares a supplier with a competitor. — Confidence: Medium
- **Finding 2:** Helios Labs appears in multiple research collaborations linked to Orion. — Confidence: Medium

## 7) Follow-ups / monitoring

- Track additional supplier overlap with competitors over the next 30 days.
- Flag new funding announcements that mention Helios Labs.

## 8) Brief metadata (optional)

- Investigation owner: Observer Analyst
- Date range: 2026-01-01 to 2026-01-09
- Tags: observer, competitive-landscape
