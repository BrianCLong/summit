# Persisted GraphQL Queries

- Source: `gateway/graphql-bff` and `gateway/src`
- Storage: `gateway/ops/persisted.json`

Recommended process:

- Collect queries from client build or BFF layer.
- Hash queries (SHA256) to IDs.
- Update `persisted.json` and enable the persisted-queries plugin.

Example ID mapping snippet in `persisted.json`:

```json
{
  "f1d2d2f924e986ac86fdf7b36c94bcdf32beec15": "query GetCase($id: ID!){ case(id:$id){ id title status } }"
}
```

Plumbing is already present under `gateway/src/plugins/persisted.ts`. Enable via Helm values:

```yaml
gateway:
  persistedQueries:
    enabled: true
    path: gateway/ops/persisted.json
```
