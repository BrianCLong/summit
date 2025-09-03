# SSO (OIDC) Setup Runbook

This runbook explains how to configure SSO with Auth0 or Azure AD, enable PKCE and MFA, and wire SCIM user lifecycle to IntelGraph.

## Overview

- OIDC login endpoints:
  - `GET /auth/login/{provider}` → Redirects to provider’s authorize URL with PKCE
  - `GET /auth/callback/{provider}` → Handles the OAuth callback, exchanges code using `code_verifier`, issues IntelGraph JWT
- SCIM endpoint:
  - `POST /auth/scim/v2/Users` → Create/update/deactivate. Expects SCIM 2.0 user payload.

Providers supported (env-driven): Auth0 (`auth0`), Azure AD (`azure`), Google (`google`).

## Server Environment

Required:

- `BASE_URL` → Public base URL of server (e.g., `https://maestro.intelgraph.ai`)
- `JWT_SECRET` → JWT signing secret
- `PKCE_STATE_SECRET` → Secret for signing PKCE state (falls back to `JWT_SECRET` if unset)

Auth0:

- `AUTH0_DOMAIN` (e.g., `example.us.auth0.com`)
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

Azure AD:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

Google (optional):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Redirect URIs

Configure these in your IdP app settings:

- Auth0: `${BASE_URL}/auth/callback/auth0`
- Azure AD: `${BASE_URL}/auth/callback/azure`
- Google: `${BASE_URL}/auth/callback/google`

## Scopes

- Auth0: `openid profile email groups`
- Azure AD: `openid profile email User.Read Directory.Read.All`
- Google: `openid profile email`

## MFA

- Auth0: Enable MFA policy in the tenant; we request `prompt=consent login` and `acr_values` to hint for MFA.
- Azure AD: Enforce Conditional Access policy requiring MFA for app sign-in.

## Group → Role Mapping

Default mapping in `OIDCAuthService.mapGroupsToRoles`:

- Admin: `IntelGraph-Admins` or `intelgraph-admin`
- Analyst: `IntelGraph-Analysts` or `intelgraph-analyst`
- Operator: `IntelGraph-Operators` or `intelgraph-operator`
- Viewer: `IntelGraph-Viewers` or `intelgraph-viewer`

Adjust mapping as needed in `server/src/services/OIDCAuthService.ts`.

## Auth0 Configuration Steps

1. Create Regular Web App in Auth0.
2. Application URIs:
   - Allowed Callback URLs: `${BASE_URL}/auth/callback/auth0`
   - Allowed Logout URLs: `${BASE_URL}`
   - Allowed Web Origins: `${BASE_URL}`
3. Enable MFA (Guardian) as needed; enforce via policies.
4. Add custom claim for groups (optional):
   - Rule/Action to add `https://intelgraph.ai/groups` array claim.
5. SCIM: If using SCIM provisioning from Auth0, configure the SCIM connection to point to `${BASE_URL}/auth/scim/v2/Users` with bearer token if needed.

## Azure AD Configuration Steps

1. App registration → New registration.
2. Redirect URI: Web → `${BASE_URL}/auth/callback/azure`
3. Certificates & secrets → Create client secret.
4. API permissions → Add Microsoft Graph: `User.Read`, `Directory.Read.All` (admin consent required).
5. Optional Claims: email, upn if needed.
6. Group claims: configure to emit groups in ID token or fetch via Graph API (we already fetch `memberOf`).
7. Conditional Access policy to require MFA.
8. SCIM provisioning (if using Entra ID): configure provisioning app to target `${BASE_URL}/auth/scim/v2/Users` and map attributes to SCIM schema.

## Verifying End-to-End

1. Hit `GET ${BASE_URL}/auth/login/auth0` (or `/azure`).
2. Complete IdP login + MFA.
3. Callback issues IntelGraph JWT; store it in your client or test via `Authorization: Bearer <token>` against `/graphql`.
4. SCIM: POST a SCIM user to `/auth/scim/v2/Users`; verify user upsert in DB and role/group mapping.

## Troubleshooting

- 400 invalid_request: Verify env vars and callback URL.
- MFA not enforced: check IdP policy; ensure `prompt`/`acr_values` are set and the policy applies to this app.
- Group mapping missing: confirm groups claim (Auth0) or that Graph API call in Azure succeeded.
- SCIM 401/403: ensure your provisioning app includes correct auth header if you guard SCIM; by default the endpoint is open for the IdP integration.
