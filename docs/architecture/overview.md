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
graph TD
  subgraph DevStack["docker-compose.dev.yaml (make up)"]
    GW[Gateway :8080]
    UI[UI :3000]
    PL[Prov Ledger :8101]
    PC[Policy Compiler :8102]
    NLQ[AI NLQ :8103]
    ER[ER Service :8104]
    ING[Ingest :8105]
    ZK[ZK-TX :8106]
    PRED[Predictd :4001]
  end

  subgraph BaseStack["docker-compose.yml"]
    NEO[(Neo4j :7474/7687)]
    PG[(Postgres :5432)]
    REDIS[(Redis :6379)]
    PL2[Prov Ledger :4010]
    PLC[Policy LAC :4000]
    NL2[NL2Cypher :4020]
    RS[Report Studio :3000]
  end
```

The diagram above reflects the services enumerated in `docker-compose.dev.yaml` (used by `make up`) and `docker-compose.yml` (base services).

## Data flow

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant Make as Makefile
  participant UI as UI (http://localhost:3000)
  participant GW as Gateway (http://localhost:8080/healthz)

  Dev->>Make: make smoke
  Make->>UI: GET /
  UI-->>Make: 200 OK
  Make->>GW: GET /healthz
  GW-->>Make: 200 OK
  Make-->>Dev: Smoke test complete
```

## Next steps

- Operate the stack using the [runbook](../operations/README.md).
- Explore the [API reference](../reference/api.md) for GraphQL interactions.
