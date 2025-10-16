# IntelGraph Backend Architecture

The IntelGraph platform is optimized for graph-first intelligence work that must meet
the Council Wishbooks’ governance, provenance, and federation mandates. The backend
stack below is production-ready for MVP-0, scales to millions of nodes/edges, and
keeps policy, audit, and observability requirements front-and-center.

## Recommended Stack (TL;DR)

| Layer                  | Technology                                                | Rationale                                                                    |
| ---------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **API**                | Node.js 18+, Express, Apollo Server (GraphQL federation)  | GraphQL contracts, schema stitching, generated types, query budgets          |
| **Graph store**        | Neo4j 5.x with official JS driver                         | Temporal/geo patterns, path/community analytics, policy labels               |
| **Relational sidecar** | PostgreSQL 15+                                            | Case metadata, audit rollups, feature snapshots, reporting views             |
| **Streaming & cache**  | Kafka/Redpanda, Redis                                     | High-volume ingest, runbook events, pub/sub, idempotency, rate limits        |
| **Policy & auth**      | OIDC/JWKS SSO, SCIM, RBAC+ABAC via Open Policy Agent      | Centralized policy bundles, reason-for-access, license/authority enforcement |
| **Observability**      | OpenTelemetry traces, Prometheus metrics, structured logs | Golden SLO dashboards, slow-query guardrails                                 |
| **Operations**         | Docker → Kubernetes (Helm), Terraform, canaries, PITR     | GitOps-friendly, resilient rollouts, cross-region replicas                   |
| **Governance**         | Provenance/claim ledger, export manifolds with hashes     | Chain-of-custody, auditable disclosures                                      |

## High-Level Topology

```
[Gateway/API]
  Node18 + Express + Apollo (GraphQL)
  ├─ AuthN (OIDC/JWKS) + Session
  ├─ AuthZ (OPA/ABAC: policy tags, purpose limits)
  ├─ Cost Guard & Query Budgets
  └─ GraphQL schema (federated)

[Services]
  • graph-core        → Neo4j (temporal+geo, provenance tags)
  • case-metadata     → Postgres (cases, tasks, SLAs, audit rollups)
  • prov-ledger       → Postgres+object store (hash trees, manifests)
  • ingestion/etl     → Kafka streams, Redis cache, enrichers
  • feature-store     → Postgres (materialized views) + parquet exports
  • guardrails/policy → OPA bundle server + license/authority compiler
  • runbook-engine    → workers (Kafka) + signed logs

[Data]
  Neo4j 5.x | Postgres 15+ | Redis | S3-compatible object store

[Observability]
  OpenTelemetry → Tempo/Jaeger, Prometheus, ELK
```

This service layout mirrors the capability map: entity/relationship graph, temporal
truth, provenance ledger, case workflows, guardrails, and export packaging.

## Core Service Responsibilities

- **Graph Core (Neo4j)**
  - Owns entity/relationship models, policy labels, temporal validity windows.
  - Supports k-hop traversals, community detection, and time-sliced neighborhoods.
  - Exposes Cypher resolvers behind GraphQL with query budget enforcement.
- **Case Metadata (Postgres)**
  - Tracks cases, tasks, SLAs, disclosure packs, and feature-store snapshots.
  - Provides reporting views and aggregates for leadership dashboards.
- **Provenance Ledger (Postgres + Object Store)**
  - Persists claim/manifold hash trees, transform chains, and export manifests.
  - Issues verifiable bundles with chain-of-custody evidence.
- **Guardrails & Policy (OPA)**
  - Evaluates RBAC + ABAC rules using tagged entities, data licenses, and stated purpose.
  - Returns human-readable denial reasons and appeal paths.
- **Ingestion & Enrichment (Kafka, Redis)**
  - Normalizes inbound evidence, enriches metadata (GeoIP, OCR, STT), deduplicates via Redis.
  - Streams `graph.upsert` events to Neo4j workers and `runbook.events` to automation.
- **Runbook Engine**
  - Executes declarative workflows (fetch → transform → score → notify) with signed logs.
  - Supports replay and offline bundles for degraded operations.

## API Gateway Blueprint

The API is GraphQL-first with Node.js and Apollo Server. Requests pass through
OpenTelemetry tracing, rate-limiters, OIDC verification, and OPA authorization
before resolvers execute domain logic.

```ts
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';

// ...imports omitted

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  introspection: process.env.NODE_ENV !== 'production',
});

app.use(
  '/graphql',
  express.json(),
  authMiddleware,
  expressMiddleware(server, {
    context: async ({ req }) => ({
      user: req.user,
      authorize: (action) => opaAuthorize(req.user, action),
    }),
  }),
);
```

This gateway centralizes authentication, authorization, and query budgeting while
leaving business logic to federated services.

## Data Management & Analytics

- **Neo4j** is the system of record for graph relationships, using temporal labels
  (`validFrom`, `validTo`) and provenance metadata. It supports subgraph exports,
  similarity, and community analytics.
- **PostgreSQL** stores strongly-consistent metadata, including case hierarchies,
  audit rollups, and feature snapshots for downstream analytics.
- **Object storage** maintains binary evidence, disclosure bundles, and parquet
  exports for external sharing.
- **Redis** backs hot entity caches, idempotency keys, and cost guard budgets.

## Security, Governance, and Compliance

- **AuthN/AuthZ**: OIDC/JWKS SSO for identity, SCIM for provisioning, and OPA for
  RBAC + ABAC enforcement with policy bundles. Every denial includes reason and appeal.
- **License & Authority Compiler**: Queries are tagged with legal basis and purpose
  limits; unsafe operations are blocked at compile time.
- **Provenance**: Each transform emits to the claim ledger, enabling tamper-evident
  exports with manifest hashes.
- **Multi-tenant isolation**: Policy tags, namespace prefixes, and optional enclave
  compute protect sensitive tenants.

## Observability & Cost Control

- **OpenTelemetry** traces every request and worker span, feeding Tempo/Jaeger.
- **Prometheus** tracks p95 latency, queue depth, Neo4j resource usage, and SLA timers.
- **Structured logging** routes to ELK/OpenSearch with correlation IDs.
- **Query budgets and slow-query killers** prevent runaway traversals and enforce SLOs.

## Deployment & Operations

1. Package services with Docker and deploy via Helm charts in Kubernetes.
2. Manage infrastructure via Terraform, including databases, Kafka, Redis, and object storage.
3. Use canary deployments with automatic rollback on SLO or policy regression.
4. Enable point-in-time recovery (PITR) and cross-region replicas for Neo4j and Postgres.
5. Provide degraded/offline kits for edge operations when connectivity is limited.

## Next Steps

1. Stand up gateway, graph-core, and case-metadata services in the cluster with OIDC and OPA wired.
2. Load a golden sample dataset and validate sub-1.5s p95 latency for three-hop queries.
3. Wire provenance manifests into export workflows and verify the external validator.
4. Bring Kafka ingestion online with GeoIP and OCR enrichers plus Redis-backed dedupe caches.
5. Publish golden dashboards (OTel + Prometheus) and codify cost guard policies.

## Open Questions

1. Target cloud regions and residency constraints for initial rollout.
2. Managed versus self-hosted Kafka/Redpanda preferences.
3. Offline/edge kit priority for MVP versus later phases.
4. Additional tenant or data localization rules beyond Wishbook guidance.
