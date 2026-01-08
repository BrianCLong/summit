# API Reference

This document provides a reference for the IntelGraph Summit API, including REST endpoints and the GraphQL schema.

## Base URL

- **Development**: `http://localhost:4000`
- **Production**: `https://api.intelgraph.io` (example)

## Authentication

All API requests (except `/auth/*` and `/health`) require a valid JWT token in the `Authorization` header.

```http
Authorization: Bearer <your_access_token>
```

## REST Endpoints

### Authentication

| Method | Endpoint              | Description          | Request Body                | Response                              |
| :----- | :-------------------- | :------------------- | :-------------------------- | :------------------------------------ |
| `POST` | `/auth/signup`        | Register a new user  | `{ email, password, name }` | `{ user, message }`                   |
| `POST` | `/auth/login`         | Log in a user        | `{ email, password }`       | `{ user, accessToken, refreshToken }` |
| `POST` | `/auth/refresh_token` | Refresh access token | (Cookie: refreshToken)      | `{ accessToken }`                     |
| `POST` | `/auth/verify-email`  | Verify email address | `{ token }`                 | `{ message }`                         |

### System

| Method | Endpoint   | Description              | Response                        |
| :----- | :--------- | :----------------------- | :------------------------------ |
| `GET`  | `/health`  | Deep system health check | `{ status, services: { ... } }` |
| `GET`  | `/metrics` | Prometheus metrics       | (Text format)                   |

### Ingestion & Webhooks

| Method | Endpoint            | Description                                    |
| :----- | :------------------ | :--------------------------------------------- |
| `POST` | `/ingestion/batch`  | Submit a batch of entities/edges for ingestion |
| `POST` | `/webhooks/:source` | Receive webhooks from external providers       |

## GraphQL API

The primary data interface is GraphQL.

- **Endpoint**: `/graphql`
- **Playground**: Available in development at `/graphql`

### Common Queries

**Search Entities**

```graphql
query Search($query: String!) {
  search(query: $query) {
    items {
      ... on Entity {
        id
        type
        properties
      }
    }
  }
}
```

**Get Entity Details**

```graphql
query GetEntity($id: ID!) {
  entity(id: $id) {
    id
    type
    properties
    relationships {
      type
      direction
      target {
        id
        type
      }
    }
  }
}
```

### Common Mutations

**Create Investigation**

```graphql
mutation CreateInvestigation($name: String!) {
  createInvestigation(name: $name) {
    id
    name
    status
  }
}
```

## Error Handling

The API returns standard HTTP status codes.

- `200`: Success
- `400`: Bad Request (Validation error)
- `401`: Unauthorized (Missing or invalid token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

Errors in GraphQL are returned in the `errors` array.

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "locations": [{ "line": 2, "column": 3 }],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```
