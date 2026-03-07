# Database Migrations Safety

## Policy

- **Forward-Only**: Prefer forward-only migrations (add columns, don't rename/delete) to support zero-downtime deploys.
- **Idempotency**: All migration scripts must be idempotent.
- **Testing**: Migrations must be tested on a staging DB copy before production.

## Workflow

1.  **Create Migration**: `npm run migrate:create <name>`
2.  **Review**: Peer review the SQL/Cypher.
3.  **Test**: Run up/down cycle locally.
4.  **Release**: Included in the release bundle.

## Safety Checks

Before applying in Prod:

- Check for `DROP TABLE` or destructive `UPDATE` without where clauses.
- Check for long-running locks (e.g., index creation on large tables).
