# Summit Security & Threat Model

This document outlines the security architecture, threat model, and cryptographic standards protecting the Summit ecosystem. It acts as the definitive reference for how Summit manages authentication, authorization, data protection, and release integrity.

## Threat Model

### Attack Surfaces

1.  **API Gateway (Envoy):** The primary ingress point for all external client traffic (GraphQL/REST). It is exposed to the public internet or external partner networks and is the first line of defense against volumetric and application-layer attacks.
2.  **Agent Ecosystem Adapters:** Integrations with external agent frameworks (LangGraph, OpenAI Agents, AutoGen, CrewAI). These adapters process potentially untrusted outputs and tool calls from external LLMs.
3.  **Data Persistence Layer:** Neo4j (GraphRAG context) and Redis (ingestion queue/cache). Exposed internally within the service mesh.
4.  **CI/CD Pipeline:** The software supply chain and deployment mechanisms (GitHub Actions, build scripts, artifact repositories) that construct and deploy the Summit platform.
5.  **Telemetry and Observability:** OpenTelemetry, Prometheus, and Grafana components. While internal, they aggregate sensitive operational state.

### Trust Boundaries

-   **External to Edge:** The boundary between external clients and the API Gateway. Traffic crossing this boundary is untrusted and must be authenticated and validated (WAF).
-   **Edge to Service Mesh:** Traffic from the Envoy Gateway to internal microservices. This boundary relies on mTLS and internal tenant-scoped JWT validation.
-   **Service to Data Store:** Communication between microservices (e.g., Python worker architecture) and data stores (Neo4j, Redis). This requires authenticated connections (e.g., database credentials managed via secrets injection).
-   **Agent to Core:** The boundary where external agent adapter outputs enter the Summit protocol stream. Data crossing this boundary must be validated for structural correctness and deterministic compliance.

### Data Flows

1.  **Ingestion:** Data flows from external sources through the API Gateway, is queued via the Redis `feed:ingest` queue, and processed by Python workers with threaded fan-out.
2.  **Graph Construction:** Processed entities and capabilities are written to Neo4j to construct the Knowledge Graph.
3.  **Query & Context:** User queries hit the API Gateway, which authenticates the request and queries Neo4j via multi-hop Cypher traversals to construct context packages for LLM routing.
4.  **Telemetry:** Services emit OpenTelemetry metrics/traces, exported to Prometheus/Jaeger, and visualized in Grafana.

## Authentication and Authorization Model

### API Gateway (Envoy)

The API Gateway is the central enforcement point for authentication and authorization. It utilizes Envoy as the edge proxy, combined with a Web Application Firewall (WAF) to filter malicious payloads before they reach the application layer.

### Tenant-Scoped JWTs

Summit employs a multi-tenant architecture. Authentication is managed via JSON Web Tokens (JWTs).
-   Tokens are cryptographically signed.
-   Tokens are explicitly **tenant-scoped**, meaning the JWT payload contains the required tenant identifier (`tenant_id`).
-   The API Gateway validates the JWT signature and extracts the tenant context. This tenant context is propagated downstream to all microservices via HTTP headers to ensure strict data isolation at the application and database layers.

### WAF and Rate Limiting

-   The Envoy Gateway integrates WAF rulesets to protect against common web vulnerabilities (e.g., OWASP Top 10, SQLi, XSS).
-   Strict rate limiting is enforced at the edge based on tenant ID and IP address to mitigate DoS attacks and resource exhaustion.

## Secrets Management and Encryption

### Encryption in Transit

-   **External:** All external traffic to the API Gateway must be encrypted using **TLS 1.2 or higher**. TLS termination occurs at the Envoy proxy.
-   **Internal (mTLS):** Communication between microservices within the service mesh is encrypted using mutual TLS (mTLS), ensuring that internal traffic cannot be easily intercepted or spoofed.

### Encryption at Rest

-   **Data Stores:** Data persisted in **Neo4j** (knowledge graph) and **Redis** (queues/cache) is encrypted at rest using industry-standard AES-256 encryption provided by the underlying infrastructure/cloud provider block storage.
-   **Secrets Management:** Secrets, API keys, and database credentials are never hardcoded. They are managed via secure secret stores (e.g., HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets) and injected into the runtime environment as environment variables or mounted volumes.

## Software Supply Chain & Release Security

Summit implements strict controls to guarantee the integrity of released artifacts and deter supply chain attacks.

-   **Cosign Signatures:** Container images and release artifacts are cryptographically signed using Cosign. Deployments require signature verification to ensure artifacts originated from the trusted CI pipeline.
-   **SLSA Provenance:** Build pipelines generate SLSA (Supply-chain Levels for Software Artifacts) provenance attestations, providing a verifiable record of how an artifact was built and what dependencies were used.
-   **SBOMs (Software Bill of Materials):** Every release includes a comprehensive SBOM. This allows for continuous vulnerability scanning of the dependency tree.
-   **Deployment Validation:** Deployments use Helm charts. SLO canary testing (via k6) is utilized to ensure operational health before fully shifting traffic to new versions.
