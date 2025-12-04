# GraphQL Command

Manage GraphQL schema, queries, and related operations for Summit.

## Schema Operations

### Check Schema Location
```bash
ls -la packages/graphql/
```

### Validate Schema
```bash
pnpm graphql:schema:check
```

### Generate TypeScript Types
```bash
pnpm graphql:codegen
```

### Build Persisted Queries
```bash
pnpm persisted:build
```

### Check Persisted Query Drift
```bash
pnpm persisted:check
```

## Common Tasks

### Add New Type

1. Update schema in `packages/graphql/schema.graphql`:
   ```graphql
   type NewEntity {
     id: ID!
     name: String!
     createdAt: DateTime!
   }
   ```

2. Extend Query/Mutation if needed:
   ```graphql
   extend type Query {
     newEntity(id: ID!): NewEntity
   }
   ```

3. Regenerate types:
   ```bash
   pnpm graphql:codegen
   ```

### Add New Resolver

Create resolver in `services/api/src/resolvers/`:
```typescript
export const newEntityResolvers = {
  Query: {
    newEntity: async (_parent, { id }, context) => {
      await context.authorize('entity:read');
      return entityService.findById(id);
    },
  },
};
```

### Test GraphQL Endpoint

```bash
# Test query
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ entities { id name } }"}'

# Test with variables
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query GetEntity($id: ID!) { entity(id: $id) { name } }", "variables": {"id": "123"}}'
```

## Schema Conventions

1. **Types**: PascalCase (`Entity`, `Investigation`)
2. **Fields**: camelCase (`createdAt`, `entityType`)
3. **Enums**: SCREAMING_SNAKE_CASE values
4. **Input Types**: Suffix with `Input` (`CreateEntityInput`)
5. **Mutations**: Verb prefix (`createEntity`, `updateEntity`)

## Troubleshooting

**Schema validation fails:**
- Check for circular references
- Validate all types are defined
- Check directive usage

**Codegen fails:**
- Ensure schema is valid
- Check codegen.yml configuration
- Verify all plugins installed
