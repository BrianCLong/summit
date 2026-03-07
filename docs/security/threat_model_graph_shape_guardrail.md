# Threat Model: Graph Shape Guardrail

## Assets

- Graph Connectivity Data (node degrees)
- Tenant Metadata
- Database Credentials

## Trust Boundaries

- Neo4j Database
- PostgreSQL Warehouse
- CI Runner Environment

## Threats

- **Secrets Exposure**: Credentials for Neo4j or Postgres leaked in logs.
  - _Mitigation_: Use environment variables and secret managers. Never log connection strings.
- **Cross-tenant Leakage**: One tenant seeing another's degree metrics.
  - _Mitigation_: Strict `tenant_id` filtering in all queries.
- **Data Minimization**: Leaking PII through node IDs in top-k reports.
  - _Mitigation_: Hash or redact node IDs in public evidence artifacts.
- **Denial of Service**: Expensive GDS queries crashing Neo4j.
  - _Mitigation_: Use sampling and bounded k for GDS streams. Run during off-peak or on read-replicas.
