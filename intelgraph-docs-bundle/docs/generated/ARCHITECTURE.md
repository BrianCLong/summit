# Architecture

```mermaid
flowchart LR
  subgraph Client [Client (React + Vite)]
    A[UI: MUI + Cytoscape] -->|GraphQL| B{Apollo Client}
  end

  subgraph Server [Server (Node.js + Express)]
    G[GraphQL API] --> H[Resolvers]
    H --> I[Services]
    I --> J[(PostgreSQL)]
    I --> K[(Neo4j)]
    I --> L[(Redis)]
    G <-->|WebSockets| A
  end

  B -->|HTTP over TLS| G

  classDef db fill:#f6f8fa,stroke:#bbb;
  class J,K,L db;
```
