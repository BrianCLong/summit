# Architecture Diagram Guide

## Purpose
This guide outlines the standard architecture diagrams required for the Summit/IntelGraph platform and how to maintain them.

---

## Required Diagrams

### 1. System Topology Diagram
**File:** `docs/architecture/diagrams/system-topology.png`
**Tool:** Draw.io, Lucidchart, or PlantUML
**Update Frequency:** Quarterly or when major services are added/removed

**Must Include:**
- All major services (API Gateway, Auth, Graph Core, etc.)
- External dependencies (Neo4j, PostgreSQL, Redis, Kafka)
- Network boundaries (DMZ, internal, data plane)
- Communication protocols (GraphQL, REST, WebSocket, gRPC)

**Template:**
```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_WITH_LEGEND()

Person(user, "User", "Intelligence Analyst")

System_Boundary(frontend, "Frontend Layer") {
    Container(web, "Web Client", "React 18, TypeScript", "Main web interface")
    Container(webapp, "Web App", "React", "Specialized applications")
}

System_Boundary(api, "API Layer") {
    Container(gateway, "API Gateway", "Express, Apollo", "GraphQL Federation Gateway")
    Container(authz, "AuthZ Gateway", "OPA", "Authorization enforcement")
}

System_Boundary(backend, "Backend Services") {
    Container(graph, "Graph Core", "Node.js", "Neo4j interface")
    Container(copilot, "AI Copilot", "Python", "AI assistant")
    Container(nlp, "NLP Service", "Python, spaCy", "Text analysis")
}

System_Boundary(data, "Data Layer") {
    ContainerDb(neo4j, "Neo4j", "Graph Database", "Entity relationships")
    ContainerDb(postgres, "PostgreSQL", "Relational DB", "Metadata, audit logs")
    ContainerDb(redis, "Redis", "Cache", "Sessions, rate limiting")
}

Rel(user, web, "Uses", "HTTPS")
Rel(web, gateway, "Queries", "GraphQL")
Rel(gateway, authz, "Enforces policies", "HTTP")
Rel(gateway, graph, "Routes requests", "GraphQL")
Rel(graph, neo4j, "Queries", "Bolt")
@enduml
```

---

### 2. Data Flow Diagram
**File:** `docs/architecture/diagrams/data-flow.png`
**Update Frequency:** When data pipelines change

**Must Include:**
- Data ingestion sources (OSINT connectors, user uploads, API integrations)
- Processing stages (validation, enrichment, entity extraction)
- Storage destinations (Neo4j, PostgreSQL, S3)
- Data transformations (ETL, AI/ML processing)

**Template:**
```
[OSINT Sources] ──→ [Ingestion Service] ──→ [Validation Queue]
                                                     ↓
[User Uploads] ──→ [File Processor] ──→ [Entity Extraction (AI)]
                                                     ↓
[API Integrations] ──→ [Webhook Handler] ──→ [Enrichment Service]
                                                     ↓
                                         [Graph Database (Neo4j)]
                                                     ↓
                                         [Analytics Engine] ──→ [Results]
```

---

### 3. Security Architecture Diagram
**File:** `docs/architecture/diagrams/security-architecture.png`
**Update Frequency:** When authentication/authorization changes

**Must Include:**
- Authentication flow (OIDC/JWT)
- Authorization enforcement points (OPA policies)
- Network security zones
- Secrets management (SOPS, sealed-secrets)
- API security (rate limiting, WAF)

**Template:**
```
User Request
    ↓
[API Gateway]
    ↓
[JWT Validation] ← [OIDC Provider (Keycloak)]
    ↓
[OPA Policy Enforcement] ← [Policy Bundles]
    ↓
[Backend Service]
    ↓
[Row-Level Security] ← [PostgreSQL RLS]
    ↓
Response
```

---

### 4. Deployment Architecture Diagram
**File:** `docs/architecture/diagrams/deployment-architecture.png`
**Update Frequency:** When infrastructure changes

**Must Include:**
- Kubernetes clusters (dev, staging, production)
- Load balancers (ingress controllers)
- CI/CD pipelines (GitHub Actions → ArgoCD)
- Observability stack (Prometheus, Grafana, Jaeger)
- Backup/DR locations

---

## Diagram Standards

### Visual Style
- **Color Coding:**
  - Frontend: Blue
  - API Layer: Green
  - Backend Services: Orange
  - Data Layer: Purple
  - External Systems: Gray

### Notation
- Solid lines: Synchronous communication
- Dashed lines: Asynchronous communication
- Arrows: Data flow direction
- Boxes: Services/components
- Cylinders: Databases
- Clouds: External systems

### File Formats
- **Source:** Store editable files (.drawio, .puml, .mmd)
- **Export:** PNG (for GitHub rendering) and SVG (for high-res documentation)
- **Location:** `/docs/architecture/diagrams/`

---

## Maintenance Process

1. **Review Cadence:** Quarterly architecture review
2. **Update Triggers:**
   - New service added/removed
   - Major dependency change
   - Security model change
   - Infrastructure migration
3. **Owner:** Platform Architect
4. **Reviewers:** Tech leads from each team

---

## Tools

### Recommended Tools
1. **PlantUML** - Text-based diagrams (version controllable)
2. **Draw.io** - Visual editor (integrates with GitHub)
3. **Mermaid** - Markdown-native diagrams (renders in GitHub)
4. **Lucidchart** - Enterprise diagramming tool

### CI Integration
- Use GitHub Actions to auto-generate PNG from PlantUML source
- Validate diagrams render correctly in PRs
- Store source files in `/docs/architecture/diagrams/src/`

---

## Examples

See existing diagram:
- `/intelgraph_enhancements/architecture_diagrams/intelgraph_architecture.puml`

---

## Questions?
Contact the Platform Architecture team or file an issue in GitHub.
