# GraphRAG API Reference

The GraphRAG (Graph Retrieval-Augmented Generation) API enables natural language querying of the knowledge graph with explainable, citation-backed responses.

## GraphQL API

### Query: `graphRagAnswer`

Queries the knowledge graph using explainable GraphRAG.

#### Arguments

| Name    | Type                  | Description                    |
| ------- | --------------------- | ------------------------------ |
| `input` | `GraphRAGQueryInput!` | Input parameters for the query |

#### `GraphRAGQueryInput`

| Field             | Type      | Description                                               |
| ----------------- | --------- | --------------------------------------------------------- |
| `investigationId` | `ID!`     | Investigation to query within                             |
| `question`        | `String!` | Natural language question                                 |
| `focusEntityIds`  | `[ID!]`   | Optional entity IDs to focus the search around            |
| `maxHops`         | `Int`     | Maximum hops for graph traversal (1-3, default: 2)        |
| `temperature`     | `Float`   | LLM temperature for response generation (0-1, default: 0) |
| `maxTokens`       | `Int`     | Maximum tokens for LLM response (100-2000, default: 1000) |
| `useCase`         | `String`  | Use case identifier for prompt/response schemas           |
| `rankingStrategy` | `String`  | Path ranking strategy (v1 or v2)                          |

#### Response: `GraphRAGResponse`

| Field        | Type          | Description                                          |
| ------------ | ------------- | ---------------------------------------------------- |
| `answer`     | `String!`     | Generated answer based on graph context              |
| `confidence` | `Float!`      | Confidence score (0-1) based on context completeness |
| `citations`  | `Citations!`  | Entity citations that support the answer             |
| `why_paths`  | `[WhyPath!]!` | Relationship paths that explain the reasoning        |

#### `Citations`

| Field       | Type     | Description                                              |
| ----------- | -------- | -------------------------------------------------------- |
| `entityIds` | `[ID!]!` | Entity IDs that were referenced in generating the answer |

#### `WhyPath`

| Field             | Type             | Description                           |
| ----------------- | ---------------- | ------------------------------------- |
| `from`            | `ID!`            | Source entity ID                      |
| `to`              | `ID!`            | Target entity ID                      |
| `relId`           | `ID!`            | Relationship ID connecting from -> to |
| `type`            | `String!`        | Relationship type                     |
| `supportScore`    | `Float`          | Support score for this path (0-1)     |
| `score_breakdown` | `ScoreBreakdown` | Breakdown of scoring factors          |

#### `ScoreBreakdown`

| Field        | Type     | Description                       |
| ------------ | -------- | --------------------------------- |
| `length`     | `Float!` | Contribution from path length     |
| `edgeType`   | `Float!` | Contribution from edge type       |
| `centrality` | `Float!` | Contribution from node centrality |

---

## Example Query

```graphql
query GetGraphRAGAnswer($input: GraphRAGQueryInput!) {
  graphRagAnswer(input: $input) {
    answer
    confidence
    citations {
      entityIds
    }
    why_paths {
      from
      to
      relId
      type
      supportScore
      score_breakdown {
        length
        edgeType
        centrality
      }
    }
  }
}
```

### Variables

```json
{
  "input": {
    "investigationId": "inv-123",
    "question": "What are the suspicious transactions related to Acme Corp?",
    "maxHops": 2,
    "temperature": 0.1
  }
}
```

---

## Technical Details

### Hallucination Control

The GraphRAG service enforces strict JSON schema validation on LLM outputs. If the LLM generates entities or relationships not present in the retrieved subgraph, the service will attempt a retry with `temperature: 0` before failing.

### Caching

Responses and subgraphs are cached in Redis using hashes of the investigation ID, focus entities, and the question. TTL is dynamically adjusted based on the popularity of the query.

### Circuit Breaker

The API is protected by a circuit breaker that trips after 5 consecutive failures or if the p95 latency exceeds 2 seconds.
