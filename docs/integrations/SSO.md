# Single Sign-On (SSO) Integration Guide

Summit supports OpenID Connect (OIDC) for Single Sign-On. This allows integration with providers like Okta, Azure AD, and Ping Identity.

## Configuration

Configure the following environment variables in your `values.yaml` or secret store:

```yaml
env:
  - name: AUTH_STRATEGY
    value: "oidc"
  - name: OIDC_ISSUER_URL
    value: "https://your-idp.example.com/"
  - name: OIDC_CLIENT_ID
    value: "summit-app"
  - name: OIDC_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: summit-secrets
        key: oidc-client-secret
  - name: OIDC_CALLBACK_URL
    value: "https://summit.example.com/auth/callback"
```

## Provider Setup

### Okta

1.  Create a new **Web App** integration.
2.  Set **Sign-in redirect URIs** to `https://<your-summit-domain>/auth/callback`.
3.  Grant the `openid`, `profile`, and `email` scopes.
4.  Copy the Client ID and Client Secret.

### Azure Active Directory (Entra ID)

1.  Register a new application.
2.  Add a **Web** platform with the Redirect URI `https://<your-summit-domain>/auth/callback`.
3.  Create a Client Secret in **Certificates & secrets**.
4.  Use the `Application (client) ID` and `Directory (tenant) ID` to form your issuer URL: `https://login.microsoftonline.com/<tenant-id>/v2.0`.

## Role Mapping

Summit maps OIDC claims to internal roles. By default, it looks for a `groups` or `roles` claim.

- `summit-admin` -> Admin Access
- `summit-analyst` -> Analyst Access
- `summit-viewer` -> Read-only Access

Custom mapping can be configured via the `OIDC_ROLE_CLAIM` and `OIDC_ROLE_MAP` variables.
