# REST Guide

## Endpoint shape

- Local base URL: `http://localhost:4000/api`

## First checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/docs
```

## Related references

- API overview: [`README.md`](./README.md)
- Authentication: [`AUTHENTICATION.md`](./AUTHENTICATION.md)
- API best practices: [`BEST_PRACTICES.md`](./BEST_PRACTICES.md)

## Status note

Treat runtime OpenAPI output (`/api/docs` and related artifacts) as the canonical list of available REST routes for your current checkout.
