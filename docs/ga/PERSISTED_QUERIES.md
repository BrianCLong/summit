# GraphQL Persisted Queries & Allowlisting (GA)

> **Version**: 1.0  
> **Last Updated**: 2026-02-05  
> **Status**: Ready

## Scope

Enforce persisted query allowlists and block non-allowlisted operations in production.

## In-Repo Implementation

- Allowlist middleware: `server/src/middleware/graphqlPersistedAllowlist.ts`
- Persisted query enforcement: `server/src/middleware/persistedQueries.ts`
- Security plugin integration: `server/src/graphql/security-plugin.ts`
- Allowlist build script: `scripts/build-query-allowlist.js`
- Client support: `apps/web/src/lib/apollo.ts`

## Enablement

1. Build allowlist:
   ```bash
   node scripts/build-query-allowlist.js
   ```
2. Deploy allowlist artifacts with the service.
3. Set enforcement flags for production.
