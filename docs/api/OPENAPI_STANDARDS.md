# OpenAPI Standards

This document outlines the standards for OpenAPI specifications within the IntelGraph repository. We use [Spectral](https://stoplight.io/spectral) to lint and enforce these rules automatically in CI.

## Standards

### 1. Operation IDs

- **Requirement**: Every operation (GET, POST, etc.) must have an `operationId`.
- **Format**: `camelCase`.
- **Example**: `getUserProfile`, `createMaestroRun`.
- **Reasoning**: Ensures consistent naming for code generation and documentation.

### 2. Error Handling

- **Requirement**: All error responses (4xx, 5xx) must have a defined schema.
- **Reasoning**: Clients need to know the structure of error responses to handle them gracefully.

### 3. Response Codes

- **Requirement**: At least one success response (2xx) is required.
- **Standard**:
  - `200`: Success.
  - `400`: Bad Request.
  - `401`: Unauthorized.
  - `403`: Forbidden.
  - `404`: Not Found.
  - `500`: Internal Server Error.

### 4. Naming Conventions

- **Path Segments**: `kebab-case` (e.g., `/api/maestro/run-console`).
- **Schema Names**: `PascalCase` (e.g., `UserProfile`, `RunConfig`).

## Running the Linter Locally

To verify your changes against the standards, run the Spectral linter locally:

```bash
npx @stoplight/spectral-cli lint docs/api-spec.yaml --ruleset openapi/.spectral.yaml
```

## CI Integration

These rules are enforced in the GitHub Actions workflow defined in `.github/workflows/api-lint.yml`. Any pull request modifying the API spec must pass this check.
