# Summit REST API Framework

Unified REST API framework with OpenAPI 3.0 specification support.

## Features

- **RESTful Design**: Full-featured REST API with resource routing
- **OpenAPI 3.0**: Automatic OpenAPI specification generation
- **Swagger UI**: Interactive API documentation
- **Validation**: JSON Schema-based request validation
- **Pagination**: Support for offset and cursor-based pagination
- **HATEOAS**: Hypermedia links for API discoverability
- **Versioning**: Multiple versioning strategies (URL, header, query, accept)
- **Rate Limiting**: Configurable rate limiting per endpoint
- **Idempotency**: Built-in idempotency key support
- **Error Handling**: Standardized error responses
- **Metrics**: Request metrics and analytics
- **Security**: JWT, OAuth, API key authentication

## Installation

```bash
npm install @intelgraph/rest-api
```

## Quick Start

```typescript
import { createAPI } from '@intelgraph/rest-api';

const api = createAPI({
  version: '1.0.0',
  title: 'My API',
  basePath: '/api/v1',
});

api.router.get('/users', async (req, res) => {
  const users = await db.users.find();
  res.success(users);
}, {
  openapi: {
    summary: 'List users',
    tags: ['users'],
    responses: {
      '200': { description: 'List of users' }
    }
  }
});

api.listen(3000);
```

## Documentation

See the [API Framework Guide](../../docs/api-reference/API_FRAMEWORK.md) for comprehensive documentation.

## License

MIT
