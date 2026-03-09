### Patterns

- **Time‑travel** queries
- **Policy‑aware** path searches (exclude classified edges)
- **Geo‑temporal** co‑presence windows

### Schema (excerpt)

```graphql
scalar DateTime

type Query {
  timeTravelOrgSuppliers(orgId: ID!, asOf: DateTime!): [Org!]!
  pathsPolicyAware(from: ID!, to: ID!, maxHops: Int = 4): [Path!]!
}
```

### Resolver Guard (TypeScript)

```ts
// server/src/graphql/guards.ts
export function assertTenant(ctx: Ctx) {
  if (!ctx.tenantId) throw new Error('tenant missing');
}
export function requireAuthority(ctx: Ctx, scope: string) {
  if (!ctx.scopes?.includes(scope)) throw new Error('unauthorized');
}
```

### Persisted Queries

```ts
// on startup, register hashes → queries; reject unknown hashes in prod
```

### Example Query

```graphql
query_pathsPolicyAware($from: ID!, $to: ID!) {
  pathsPolicyAware(from: $from, to: $to, maxHops: 3) { nodes { id kind } edges { kind policyTags } }
}
```
