# Workspace Setup Requirements for Full Type Checking

**Created:** 2026-01-26
**Related:** [SALVAGE_FROM_CLOSED_PRS.md](./SALVAGE_FROM_CLOSED_PRS.md)

---

## Quick Start

To enable full typecheck across all workspace packages:

```bash
# Install all workspace dependencies
pnpm install

# Run full typecheck
pnpm typecheck
```

---

## Current State (Without `pnpm install`)

The root `tsconfig.json` has been configured to allow basic typecheck without full workspace installation:

### Packages That Pass Without Install
- `packages/types` - Pure TypeScript types, no external dependencies
- `packages/sdk-ts` - Minimal dependencies

### Packages Requiring `pnpm install`
| Package | Missing Dependencies | GA Critical? |
|---------|---------------------|--------------|
| packages/feature-flags | react, @types/react, eventemitter3 | Yes (used in server) |
| packages/tasks-core | @types/node | No |
| packages/sigint-processor | zod | No |
| packages/common-types | zod, @jest/globals | No |
| packages/maestro-core | axios, @types/node, events, uuid | No |
| packages/maestro-cli | Various CLI deps | No |
| packages/prov-ledger | Various deps | No |
| services/api-gateway | Express, middleware deps | Yes |
| services/graph-core | Neo4j driver, deps | Yes |
| services/streaming-ingest | Kafka, stream deps | Yes |

---

## Full Workspace References

To restore full typecheck coverage, update `tsconfig.json` references after `pnpm install`:

```json
{
  "references": [
    { "path": "packages/sdk-ts" },
    { "path": "packages/tasks-core" },
    { "path": "packages/sigint-processor" },
    { "path": "packages/common-types" },
    { "path": "packages/types" },
    { "path": "packages/feature-flags" },
    { "path": "packages/maestro-cli" },
    { "path": "packages/maestro-core" },
    { "path": "packages/prov-ledger" },
    { "path": "services/api-gateway" },
    { "path": "services/graph-core" },
    { "path": "services/streaming-ingest" }
  ]
}
```

---

## Server-Specific Typecheck

The server has its own typecheck that also requires `pnpm install`:

```bash
cd server
pnpm install
pnpm typecheck
```

Server typecheck requires:
- `@types/node`
- `@types/jest`
- All server dependencies from `server/package.json`

---

## CI Configuration

CI workflows (`ci.yml`, `ci-core.yml`) run `pnpm install --frozen-lockfile` before typecheck, ensuring all dependencies are available.

For local development without full install, use the minimal typecheck:
```bash
pnpm typecheck  # Uses reduced tsconfig.json references
```

---

## Troubleshooting

### "Cannot find module 'X'" Errors
Run `pnpm install` at workspace root to resolve all dependencies.

### "Cannot find type definition file for 'node'"
Ensure `@types/node` is installed: `pnpm add -D @types/node`

### Workspace Linking Issues
```bash
pnpm install --force  # Force reinstall and relink
```

---

## Related Documentation

- [SALVAGE_FROM_CLOSED_PRS.md](./SALVAGE_FROM_CLOSED_PRS.md) - Salvage ledger with typecheck fix details
- [EXPRESS5_MIGRATION_PLAN.md](./EXPRESS5_MIGRATION_PLAN.md) - Deferred Express 5 migration
