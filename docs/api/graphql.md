# GraphQL Guide

## Endpoint

- Local endpoint: `http://localhost:4000/api/graphql`

## Minimum validation query

```graphql
{
  health {
    status
    version
  }
}
```

## Related references

- API overview: [`README.md`](./README.md)
- API quickstart: [`QUICKSTART.md`](./QUICKSTART.md)
- GraphQL governance/contract context: [`../architecture/API_CONTRACTS.md`](../architecture/API_CONTRACTS.md)

## Status note

GraphQL capabilities evolve quickly across this repository. Prefer runtime schema introspection in your running environment for authoritative field-level availability.
