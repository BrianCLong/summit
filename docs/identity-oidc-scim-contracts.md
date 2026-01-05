# OIDC + SCIM Stub Contracts

This document defines the stub request/response contracts for identity integrations. The
contracts are implemented in `server/src/services/identity/OidcScimContracts.ts`.

## OIDC Provider Registration

**Request**

```json
{
  "tenantId": "tenant-123",
  "issuerUrl": "https://login.example.com",
  "clientId": "summit-client",
  "clientSecretRef": "vault://identity/oidc/summit-client",
  "redirectUris": ["https://summit.example.com/auth/callback"],
  "scopes": ["openid", "profile", "email", "groups"],
  "signingAlgorithm": "RS256"
}
```

**Response**

```json
{
  "tenantId": "tenant-123",
  "issuerUrl": "https://login.example.com",
  "authorizationEndpoint": "https://login.example.com/oauth2/v2/auth",
  "tokenEndpoint": "https://login.example.com/oauth2/v2/token",
  "jwksUri": "https://login.example.com/oauth2/v2/keys",
  "logoutEndpoint": "https://login.example.com/logout",
  "status": "registered",
  "metadata": {
    "signingAlgorithm": "RS256",
    "scopes": "openid profile email groups"
  }
}
```

## SCIM Provisioning Registration

**Request**

```json
{
  "tenantId": "tenant-123",
  "baseUrl": "https://idp.example.com/scim/v2",
  "bearerTokenRef": "vault://identity/scim/token",
  "userSyncSchedule": "0 */4 * * *",
  "groupSyncSchedule": "15 */6 * * *",
  "userFilter": "active eq true"
}
```

**Response**

```json
{
  "tenantId": "tenant-123",
  "integrationId": "scim_7f2c1e",
  "status": "configured",
  "endpoints": {
    "users": "https://idp.example.com/scim/v2/Users",
    "groups": "https://idp.example.com/scim/v2/Groups",
    "serviceProviderConfig": "https://idp.example.com/scim/v2/ServiceProviderConfig"
  }
}
```
