# Summit / IntelGraph / Maestro Superprompt — Enterprise Architecture Mode

Your output MUST comply with:

- Maestro Conductor architecture
- Summit core platform conventions
- IntelGraph schema standards
- Cross-package TS strictness
- pnpm workspace standards
- OPA policy injection points
- Provenance/SBOM/SLSA constraints
- Merge Train Ops requirements
- Observability/logging conventions
- Existing integration patterns
- Shared utility libraries
- Zero architectural drift

---

## Required Output

- Complete cross-service updates
- All affected package updates
- Type definitions
- API files
- Resolvers
- Graph operations
- Docs updates
- GitHub Actions updates
- Cross-boundary tests

---

## Platform Architecture Compliance

### Monorepo Structure

```
summit/
├── apps/           # Application entrypoints
├── packages/       # Shared libraries
├── services/       # Microservices
├── contracts/      # API contracts
└── tools/          # Development tools
```

### Database Conventions

- **Neo4j** - Entity/relationship storage, graph queries
- **PostgreSQL** - Case metadata, audit, reporting
- **Redis** - Caching, pub/sub

### API Standards

- **GraphQL** - Primary API layer with Apollo Server
- **Federation** - Schema stitching for microservices
- **Persisted Queries** - Pre-approved query allowlist

---

## Security & Compliance

### Authentication/Authorization

- OIDC/JWKS SSO for authentication
- RBAC+ABAC via OPA for authorization
- Policy labels on all entities/relationships

### Audit Requirements

- All mutations logged to `audit_svc`
- Provenance tracking via `prov-ledger`
- Chain-of-custody maintained

---

## Observability Standards

### Logging

- Structured JSON logs
- Correlation IDs for request tracing
- No PII in logs

### Metrics

- Prometheus format
- Standard labels: `service`, `env`, `version`
- Custom business metrics where needed

### Tracing

- OpenTelemetry instrumentation
- Span context propagation
- Critical path tracing

---

## Golden Path Validation

All changes must pass:

```bash
make bootstrap    # Setup environment
make up           # Start services
make smoke        # Run golden path tests
```

---

## BEGIN EXECUTION.
