# CompanyOS Developer Guide

> **Purpose**: Quick-start guide for CompanyOS development
> **Last Updated**: 2024-12-08

## Quick Start

```bash
# From the companyos/ directory
make setup  # Full setup: install deps, start stack, run migrations, smoke test

# Or step by step:
make dev-up      # Start development stack
make db-migrate  # Run database migrations
make smoke       # Validate everything works
```

## Development Stack

The CompanyOS development stack includes:

| Service | Port | Description |
|---------|------|-------------|
| companyos-api | 4100 | Main CompanyOS API |
| companyos-opa | 8181 | OPA policy decision point |
| companyos-db | 5432 | PostgreSQL database |

## Common Commands

### Stack Management

```bash
make dev-up     # Start all services
make dev-down   # Stop all services
make logs       # View service logs
```

### Testing

```bash
make test       # Run all tests (unit + integration + OPA)
make smoke      # Quick health check of all services
make opa-test   # Run OPA policy tests only
```

### Database

```bash
make db-migrate  # Apply database migrations
make db-reset    # Reset database (WARNING: destroys data)
```

### Build & Lint

```bash
make build      # Build all packages
make lint       # Run linting
make typecheck  # Run TypeScript type checking
make clean      # Clean build artifacts
```

## Project Structure

```
companyos/
├── db/
│   └── migrations/          # SQL migrations
├── policies/                # OPA Rego policies
├── services/
│   └── companyos-api/       # Main API service
│       └── src/
│           ├── services/    # Business logic services
│           ├── types/       # TypeScript types
│           └── utils/       # Utilities
├── Makefile                 # Developer commands
└── COMPANYOS_DEV.md         # This file
```

## Key Features

### Tenant Lifecycle Management (A1)

Tenants can be in one of these states:
- `PENDING` - Created but not yet activated
- `ACTIVE` - Normal operation
- `SUSPENDED` - Read-only or blocked
- `DELETION_REQUESTED` - Scheduled for deletion
- `DELETED` - Soft-deleted (data retained)

### Tenant Onboarding (A2)

New tenants go through a structured onboarding:
1. Create tenant record
2. Assign admin users
3. Configure features and quotas
4. Send welcome email
5. Verify and activate

### Audit Log Viewer (A3)

All operations are logged and can be queried:
- Filter by tenant, actor, time range
- Search by event type or description
- Export for compliance

### OPA Authorization (B1)

Policy-based authorization using OPA:
- Tenant lifecycle operations gated by policy
- Role-based access control
- Hot-reloadable policies

### Rate Limiting (B2)

Per-tenant rate limits:
- Configurable by tier
- Per-endpoint overrides
- Metrics for monitoring

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :4100 -i :5432 -i :8181

# Reset everything
make dev-down
docker system prune -f
make dev-up
```

### Database issues

```bash
# Check database is running
docker ps | grep companyos-db

# Connect directly
docker exec -it $(docker ps -qf "name=companyos-db") psql -U companyos

# Reset database
make db-reset
```

### OPA policy errors

```bash
# Check policy syntax
make opa-check

# Run policy tests
make opa-test

# View OPA logs
docker logs $(docker ps -qf "name=companyos-opa")
```

## Environment Variables

Key environment variables (set in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4100 | API server port |
| `OPA_URL` | http://localhost:8181 | OPA service URL |
| `DATABASE_URL` | postgresql://... | PostgreSQL connection |
| `LOG_LEVEL` | info | Logging level |
| `NODE_ENV` | development | Environment |

## Next Steps

- Review the [API documentation](./docs/api.md)
- Check the [OPA policies](./policies/authz.rego)
- Run the test suite: `make test`
