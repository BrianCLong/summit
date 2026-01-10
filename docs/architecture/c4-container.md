# C4 Container Diagram — Summit / IntelGraph

## Container inventory

- **Web UI (React/Vite)** — browser SPA served by Vite/Node, communicates with the API via HTTPS and WebSocket subscriptions.【F:ARCHITECTURE_MAP.generated.yaml†L82-L115】
- **GraphQL API (Node/Apollo/Express)** — primary boundary for queries, mutations, subscriptions, and REST fallbacks; integrates Neo4j, PostgreSQL, Redis, Socket.IO, and OPA.【F:ARCHITECTURE_MAP.generated.yaml†L40-L80】【F:server/src/index.ts†L1-L160】
- **Background Worker (BullMQ)** — executes queued jobs, scheduled tasks, and ingestion workloads using Redis queues.【F:ARCHITECTURE_MAP.generated.yaml†L116-L142】
- **Data Stores** — Neo4j for graph analytics, PostgreSQL with pgvector for structured data and embeddings, Redis for cache/queues.【F:ARCHITECTURE_MAP.generated.yaml†L147-L199】
- **Policy Engine** — Open Policy Agent (OPA) serving authorization decisions consumed by the API layer.【F:ARCHITECTURE_MAP.generated.yaml†L284-L299】
- **Observability Stack** — OpenTelemetry Collector exporting to Prometheus (metrics) and Jaeger (traces) with Grafana dashboards.【F:ARCHITECTURE_MAP.generated.yaml†L211-L278】
- **Optional AI & Streaming** — Kafka, Zookeeper, ingestion service, NLP and reliability services, and AI worker for multimodal processing under compose profiles.【F:ARCHITECTURE_MAP.generated.yaml†L341-L440】

## Container relationships (Level 2)

```mermaid
C4Container
    title Summit / IntelGraph – Container View
    Person(analyst, "Analyst")
    Person(automation, "Automation Caller")

    System_Boundary(summit, "Summit Platform") {
        Container(web, "Web UI", "React/Vite", "Graph exploration & reporting")
        Container(api, "GraphQL API", "Node/Apollo/Express", "Queries, mutations, subscriptions, REST fallbacks")
        Container(worker, "Background Worker", "Node/BullMQ", "Async jobs, ingestion, clean-up")
        ContainerDb(pg, "PostgreSQL", "pgvector", "Metadata, audit, embeddings")
        ContainerDb(neo, "Neo4j", "Graph DB", "Entity graph & analytics")
        ContainerDb(redis, "Redis", "Cache/Queue", "BullMQ, rate limits, sessions")
        Container(opa, "OPA", "Policy engine", "AuthZ decisions")
        Container(obs, "Observability", "OTEL→Prometheus/Grafana/Jaeger", "Metrics/traces/dashboards")
        Container(kafka, "Kafka + AI Workers", "Optional", "Streaming + AI pipelines")
    }

    Rel(analyst, web, "Uses")
    Rel(automation, api, "Calls GraphQL/REST")
    Rel(web, api, "HTTPS + WebSocket subscriptions")
    Rel(api, worker, "Dispatches jobs via Redis/BullMQ")
    Rel(api, pg, "SQL/pgvector")
    Rel(api, neo, "Cypher")
    Rel(api, redis, "Cache, queues, rate limits")
    Rel(api, opa, "Policy checks")
    Rel(worker, redis, "Consumes/produces jobs")
    Rel(api, obs, "OTEL metrics/traces")
    Rel(worker, obs, "OTEL metrics/traces")
    Rel(api, kafka, "Optional: consume/produce events")
    Rel(worker, kafka, "Optional: ingestion/AI jobs")
```

## API component spotlight (Level 3 excerpt)

```mermaid
C4Component
    title GraphQL API – Component Focus
    Container_Boundary(api, "GraphQL API") {
        Component(router, "Express Router", "Middleware, health, static assets")
        Component(graphql, "Apollo Server", "Schema, resolvers, validation")
        Component(subs, "GraphQL WS + Socket.IO", "Subscriptions, backpressure, presence")
        Component(data, "Data Access", "Neo4j driver, Postgres clients, Redis cache")
        Component(policy, "Policy Adapter", "OPA checks + auth context")
        Component(obsComp, "Telemetry Hooks", "OTEL metrics/traces export")
    }

    Rel(router, graphql, "Routes /graphql requests")
    Rel(graphql, data, "Executes resolvers")
    Rel(graphql, policy, "Evaluates authorization")
    Rel(subs, data, "Fan-out events, track subscriptions")
    Rel(graphql, obsComp, "Emit traces/metrics")
    Rel(subs, obsComp, "Emit metrics/backpressure stats")
    Rel(router, obsComp, "HTTP metrics")
```

## Operational notes

- The API and worker initialize OpenTelemetry and Prometheus exporters for metrics and tracing to the observability stack.【F:ARCHITECTURE_MAP.generated.yaml†L62-L78】【F:ARCHITECTURE_MAP.generated.yaml†L211-L278】
- Production mode serves the built client from the API process to simplify deployment when CDN hosting is not required.【F:server/src/index.ts†L136-L145】
- Compose profiles `ai` and `kafka` keep optional services opt-in while preserving the golden-path developer experience.【F:ARCHITECTURE_MAP.generated.yaml†L341-L440】
