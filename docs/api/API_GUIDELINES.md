# API Design Guidelines

This document outlines the standards and best practices for developing APIs at Summit (IntelGraph).

## REST API Standards

### 1. Resource Naming

- Use plural nouns for resources (e.g., `/users`, `/runs`).
- Use kebab-case for URL paths (e.g., `/api/maestro/runs`).
- Use camelCase for query parameters and JSON properties.

### 2. HTTP Methods

- `GET`: Retrieve resources. Safe and idempotent.
- `POST`: Create new resources. Not safe or idempotent.
- `PUT`: Update/Replace a resource. Idempotent.
- `PATCH`: Partial update. Not necessarily idempotent (but should be designed to be).
- `DELETE`: Remove a resource. Idempotent.

### 3. Status Codes

- `200 OK`: Success (GET, PUT, PATCH).
- `201 Created`: Success (POST).
- `204 No Content`: Success (DELETE).
- `400 Bad Request`: Validation error.
- `401 Unauthorized`: Authentication required/failed.
- `403 Forbidden`: Authenticated but not authorized.
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server-side crash.

### 4. Versioning

- We use header-based versioning: `x-ig-api-version`.
- Default version is currently `1.1`.
- New versions must be backwards compatible where possible.

### 5. Documentation

- All public endpoints must be documented using JSDoc `@openapi` annotations.
- Include request body schemas and response schemas.
- Document error responses.

## GraphQL Standards

### 1. Naming

- Use camelCase for fields and arguments.
- Use PascalCase for Types.
- Mutation names should be `verbNoun` (e.g., `createRun`).

### 2. Directives

- Use `@auth` for field-level authorization.
- Use `@pii` for sensitive fields.

### 3. Pagination

- Use Relay-style cursor pagination for lists (`edges`, `node`, `pageInfo`).

### 4. Errors

- Return user-friendly error messages in the `errors` array.
- Use custom error codes (e.g., `VALIDATION_ERROR`).

## Security

- Always use HTTPS.
- Validate all inputs using Zod schemas.
- Implement rate limiting (Global + User-based).
- Never expose internal IDs or stack traces in production.
