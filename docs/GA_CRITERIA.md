# GA Criteria

## Tier-0 Journeys

Core user workflows that must succeed for the product to be viable.

1.  **Authentication & Authorization**
    - Sign Up (Self-serve)
    - Login (Email/Password, MFA)
    - Session Management (Refresh, Revoke)
    - Tenant Context Switching

2.  **Data Ingestion (The Loop Input)**
    - Connector Setup (Source Config)
    - Ingestion Job Execution
    - Entity/Edge Verification (Data Landing)

3.  **Search & Investigation (The Loop Core)**
    - Global Search (Keyword -> Entity)
    - Graph Exploration (Node Expansion, Pathfinding)
    - Canvas Manipulation (Layout, Filtering)

4.  **AI Analysis (The Loop Force Multiplier)**
    - Copilot Chat (NL -> Query)
    - RAG Inquiry (Context Retrieval)

5.  **Administrative & Compliance (The Loop Control)**
    - User Management (Invite, Role Assign)
    - Audit Log Review
    - Export Data (Report Generation)

## SLO Targets

Service Level Objectives that define production readiness.

- **Availability**: 99.9% uptime for Tier-0 APIs.
- **Latency (GraphQL)**:
  - p95 ≤ 1500ms for complex queries (depth ≤ 3).
  - p95 ≤ 350ms for simple queries.
- **Latency (Ingest)**: 10k records/sec throughput.
- **Error Rate**: < 1% for all HTTP/GraphQL requests.
- **Job Success**: > 99% for background ingestion jobs.

## Supported Configurations

Validated environments for GA.

- **Infrastructure**: Kubernetes (Helm Charts), Docker Compose (Dev/On-prem).
- **Database**:
  - PostgreSQL 15+ (Primary Store)
  - Neo4j 5.x (Graph Store)
  - Redis 7+ (Cache/Queue)
- **Browser**: Chrome (Latest), Firefox (Latest), Safari (Latest), Edge (Latest).
- **Dependencies**: Node 18+, Python 3.11+.

## Severity Definitions (Bug Triage)

Criteria for blocking release.

- **Sev-1 (Critical)**: Tier-0 journey is completely blocked for all users or a subset of tenants. Data loss or corruption. Security vulnerability (Remote Code Execution, Auth Bypass, PII Leak). **BLOCKS GA.**
- **Sev-2 (High)**: Tier-0 journey has significant friction or workaround required. Feature broken but not critical to core loop. **BLOCKS GA if > 0.**
- **Sev-3 (Medium)**: Non-critical bug, cosmetic issue, or edge case. Workaround exists.
- **Sev-4 (Low)**: Minor UI/UX annoyance, typo.
