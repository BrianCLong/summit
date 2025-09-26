# API Key Management for External Clients

## Overview
Summit's GraphQL API now supports first-class API keys for machine-to-machine access. Keys are stored in PostgreSQL with enforced expiration and tenant scoping, allowing security teams to rotate and revoke credentials without redeploying services. Every API request that includes an `x-api-key` header is authenticated server side and mapped onto an RBAC role before resolvers execute.

## Database Schema
API keys are persisted in the `api_keys` table created by the `2025-09-02_api_keys.sql` migration. Each record tracks:

- `id` (UUID primary key)
- `name` (friendly label surfaced in tooling)
- `scope` (`VIEWER`, `ANALYST`, `OPERATOR`, or `ADMIN`)
- `tenant_id` (optional tenant scoping)
- `created_by` / `revoked_by` (actor IDs for auditing)
- `expires_at`, `revoked_at`, and `last_used_at` timestamps
- `key_hash` (SHA-256 hash of the issued secret)

Secrets are never stored in plaintext; only hashed values are persisted and lookups are performed against the hash.

## GraphQL Operations
New GraphQL schema elements expose administrative workflows:

```graphql
# Query
query ListKeys {
  apiKeys(includeRevoked: false) {
    id
    name
    scope
    expiresAt
    revokedAt
    lastUsedAt
  }
}

# Mutations
mutation CreateKey($input: CreateApiKeyInput!) {
  createApiKey(input: $input) {
    key      # return this once and store it securely
    apiKey {
      id
      scope
      expiresAt
    }
  }
}

mutation RevokeKey($id: ID!) {
  revokeApiKey(id: $id) {
    id
    revokedAt
    revokedBy
  }
}
```

`CreateApiKeyInput` requires a name, scope, and ISO 8601 expiration timestamp. The optional `tenantId` defaults to the caller's tenant.

## RBAC Guardrails
Only administrators (`role: ADMIN`) may list, create, or revoke API keys. Attempting to call any of the above operations as a non-admin results in a `forbidden` GraphQL error. Issued keys inherit the configured scope and are projected into the request context as their acting role, ensuring downstream resolvers honour existing RBAC checks.

## Request Authentication Flow
1. Clients send `x-api-key: <secret>` with each GraphQL request.
2. Middleware hashes the secret, loads the key record from PostgreSQL, and validates expiry/revocation.
3. On success, the request context receives a synthetic user `{ id: "api-key:<uuid>", role: <scope>, tenantId, type: 'API_KEY' }`.
4. The `last_used_at` column is updated for auditability.
5. Standard bearer token authentication continues to work when no API key header is present.

## Operational Guidance
- Rotate keys by creating a replacement, updating clients, then revoking the prior key.
- Use descriptive names (e.g., `partner-crm-prod`) to simplify audits.
- Monitor `last_used_at` to detect dormant or compromised credentials.
- Store the returned secret in a secure vault; the platform cannot recover it after creation.
