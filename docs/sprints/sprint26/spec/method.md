# InfoMap Service Architecture

## System Overview
The `InfoMap` service is responsible for constructing and querying the "Information Environment Graph". It sits between the raw data ingestion pipelines and the Analyst UI.

### Components

1.  **Ingestion Service (Producer)**
    *   **Role:** Fetches data from external APIs (Twitter, GDELT, RSS).
    *   **Behavior:** Pushes normalized `GraphNode` and `GraphEdge` objects to a Kafka/Redpanda topic (or Redis Stream for MVP).
    *   **Privacy Guard:** Anonymizes PII before pushing.

2.  **InfoMap Graph Service (Consumer + Storage)**
    *   **Role:** Consumes from the stream and writes to Neo4j.
    *   **Storage:** Neo4j Database.
    *   **Schema:**
        *   `(:MediaSource {url, trustScore, tier})`
        *   `(:SocialAccount {platform, handleHash, botProbability})`
        *   `(:Narrative {topic, keywords})`
        *   `[:CITES]`, `[:AMPLIFIES]`, `[:MENTIONS]`

3.  **Graph Algo Engine (Analysis)**
    *   **Role:** Runs periodic or on-demand algorithms.
    *   **Algorithms:**
        *   `PageRank` (Influence scoring).
        *   `Louvain Modularity` (Community detection).
        *   `ShortestPath` (Bridge node identification).
    *   **Library:** Neo4j Graph Data Science (GDS) or dedicated Python worker (NetworkX/cuGraph).

4.  **GraphQL API (Access)**
    *   **Role:** Exposes data to the frontend.
    *   **Resolver:** `mapInfoEnvironment(seed: ID, depth: Int)` -> Cypher Query.

## Data Flow
1.  **Ingest:** `IngestionService` -> `Redis Stream (info-map-ingest)`
2.  **Persist:** `InfoMapWorker` -> `Neo4j`
3.  **Analyze:** `GraphAlgoWorker` -> `Neo4j (Update Properties)`
4.  **Query:** `Analyst UI` -> `GraphQL API` -> `Neo4j (Read)`

## Key Interfaces

### GraphQL Schema Extension
```graphql
extend type Query {
  mapInfoEnvironment(seedNodeId: ID!, depth: Int = 2): InfoGraph
}

type InfoGraph {
  nodes: [InfoNode!]!
  edges: [InfoEdge!]!
  metadata: GraphMetadata
}

type InfoNode {
  id: ID!
  type: String! # Media, Social, Narrative
  influenceScore: Float
  riskLevel: String
}
```

## Complexity Notes
*   **Expansion Explosion:** A 3-hop query on a viral tweet can return 100k+ nodes.
*   **Mitigation:** Implement "Importance Sampling" in the Cypher query. Only return the top K nodes per hop based on `influenceScore`.
    *   `CALL gds.pageRank...` pre-calc.
    *   Query: `MATCH (n)-[r]->(m) WHERE m.rank > threshold ...`
