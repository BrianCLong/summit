# Wave 0 Implementation Scripts

Scripts for implementing Wave 0: Baseline Stabilization of the Summit strategic roadmap.

## Quick Start

```bash
# Run all Wave 0 tasks
./scripts/wave0/run-all.sh

# Or run individual tasks
./scripts/wave0/01-validate-golden-path.sh
./scripts/wave0/02-install-packages.sh
./scripts/wave0/03-run-health-checks.sh
```

## Scripts

### 01-validate-golden-path.sh
Validates the golden path is working:
- `make bootstrap` succeeds
- `make up` starts all services
- `make smoke` passes

### 02-install-packages.sh
Installs new governance packages:
- @summit/authority-compiler
- @summit/canonical-entities
- @summit/connector-sdk
- @summit/prov-ledger-extensions
- @summit/governance-hooks

### 03-run-health-checks.sh
Runs comprehensive health checks:
- Database connectivity (Neo4j, Postgres, Redis)
- Service health endpoints
- GraphQL schema validation

### 04-validate-schema.sh
Validates canonical entity types:
- TypeScript compilation
- Zod schema validation
- GraphQL type generation

### 05-generate-reports.sh
Generates Wave 0 completion reports:
- Test coverage report
- Service inventory
- Integration checklist

## Wave 0 Checklist

- [ ] Golden path passes on fresh clone
- [ ] Test coverage ≥ 70%
- [ ] All 8 canonical entity types defined
- [ ] Connector registry has all 13 connectors
- [ ] CLI doctor validates full stack
- [ ] Structured logging consolidated
- [ ] Authority compiler integrated
- [ ] Provenance hooks operational
