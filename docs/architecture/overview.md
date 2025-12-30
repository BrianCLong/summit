---
title: "Architecture"
summary: "Component map and primary data flow for Summit MVP-4."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "architecture"
---

# Architecture

## Component diagram

```mermaid
graph LR
  subgraph Client
    UI[UI (port 3000)]
  end

  subgraph Gateway
    GW[Gateway (policy-lac)]
  end

  subgraph Services
    PC[Policy Compiler]
    NLQ[AI NLQ]
    ER[Entity Resolution]
    ING[Ingest]
    ZK[ZK-TX]
    PL[Prov Ledger]
    PRED[Predictd]
  end

  subgraph DataStores
    PG[(PostgreSQL)]
    NEO[(Neo4j)]
    REDIS[(Redis)]
  end

  UI --> GW
  GW --> PC
  GW --> NLQ
  GW --> ER
  GW --> ING
  GW --> ZK
  GW --> PL
  GW --> PRED

  GW --> PG
  GW --> NEO
  GW --> REDIS
```

## Data flow

```mermaid
sequenceDiagram
  participant User
  participant UI as UI (3000)
  participant GW as Gateway (4000/8080)
  participant NLQ as AI NLQ
  participant PC as Policy Compiler
  participant ER as Entity Resolution
  participant PG as PostgreSQL
  participant NEO as Neo4j
  participant REDIS as Redis

  User->>UI: Request investigation action
  UI->>GW: GraphQL mutation (launchRun)
  GW->>PC: Evaluate policy and route
  GW->>NLQ: Optional NLQ processing
  GW->>ER: Resolve entities / ingest
  ER-->>PG: Write structured records
  ER-->>NEO: Update graph relationships
  GW-->>REDIS: Cache job metadata / rate limits
  GW-->>User: Return Run state (QUEUED/RUNNING/SUCCEEDED)
```

## Next steps

- Operate the stack using the [runbook](../operations/README.md).
- Explore the [API reference](../reference/api.md) for GraphQL interactions.
