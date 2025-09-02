# SSO Setup for Maestro UI

This document outlines the process for configuring Single Sign-On (SSO) with Maestro UI using various OpenID Connect (OIDC) providers. Maestro UI leverages a backend gateway to mediate token exchange, ensuring that no client secrets are exposed in the browser.

## Supported OIDC Providers

Maestro UI supports integration with the following OIDC providers:

*   Auth0
*   Azure Active Directory
*   Google

## General Setup Steps

For each provider, the general setup involves:

1.  **Registering a Client Application:** In your OIDC provider's console, register a new client application. Choose a "Single Page Application" or "Web Application" type if available.
2.  **Configuring Redirect URIs:** Set the allowed redirect URI(s) to `YOUR_MAESTRO_UI_BASE_URL/maestro/auth/callback`. For local development, this might be `http://localhost:3000/maestro/auth/callback` (or whatever port your UI runs on).
3.  **Obtaining Client ID:** Note down the Client ID (also known as Application ID or Audience) provided by your OIDC provider. This will be used in your Maestro backend configuration.
4.  **Configuring Backend Gateway:** Your Maestro backend gateway needs to be configured with the client ID and other provider-specific details. Refer to the backend's documentation for precise environment variables or configuration files (e.g., `application.yml`, `.env`).

## Provider-Specific Notes

### Auth0

*   **Application Type:** Single Page Application
*   **Allowed Callback URLs:** `YOUR_MAESTRO_UI_BASE_URL/maestro/auth/callback`
*   **Allowed Web Origins:** `YOUR_MAESTRO_UI_BASE_URL`
*   **Allowed Logout URLs:** `YOUR_MAESTRO_UI_BASE_URL`

### Azure Active Directory

*   **Application Type:** Single-page application (or Web if SPA is not an option, and configure redirect URIs accordingly).
*   **Redirect URI:** `YOUR_MAESTRO_UI_BASE_URL/maestro/auth/callback` (Type: SPA)
*   **Implicit grant and hybrid flows:** Ensure "ID tokens" and "Access tokens" are checked under Authentication settings if using implicit flow, though PKCE is preferred.

### Google

*   **Application Type:** Web application
*   **Authorized redirect URIs:** `YOUR_MAESTRO_UI_BASE_URL/maestro/auth/callback`

## Environment Variables (Example)

Your backend gateway will typically use environment variables to configure the OIDC providers. Examples might include:

```bash
# Auth0
OIDC_AUTH0_CLIENT_ID=your_auth0_client_id
OIDC_AUTH0_ISSUER_URI=https://your-auth0-domain.auth0.com/

# Azure AD
OIDC_AZURE_CLIENT_ID=your_azure_client_id
OIDC_AZURE_TENANT_ID=your_azure_tenant_id
OIDC_AZURE_ISSUER_URI=https://login.microsoftonline.com/your_azure_tenant_id/v2.0

# Google
OIDC_GOOGLE_CLIENT_ID=your_google_client_id
OIDC_GOOGLE_ISSUER_URI=https://accounts.google.com
```

## How the Gateway Mediates Token Exchange

Maestro UI implements the Authorization Code Flow with PKCE (Proof Key for Code Exchange). This is a secure flow for public clients (like single-page applications) as it avoids the need for the client to store a client secret.

1.  **Initiate Login:** When a user clicks a login button in Maestro UI, the UI generates a `code_verifier` and `code_challenge` (PKCE). It then redirects the user to the OIDC provider's authorization endpoint, including the `code_challenge` and a `redirect_uri` pointing back to Maestro UI's `/maestro/auth/callback`.
2.  **User Authentication:** The user authenticates with the OIDC provider.
3.  **Authorization Code:** The OIDC provider redirects the user back to `YOUR_MAESTRO_UI_BASE_URL/maestro/auth/callback` with an authorization `code`.
4.  **Token Exchange (via Gateway):** Maestro UI's `AuthCallback` component intercepts this `code`. It then sends this `code` along with the original `code_verifier` (stored temporarily in session storage) to the Maestro backend gateway's token exchange endpoint (e.g., `/api/maestro/v1/auth/oidc/callback/:provider`).
5.  **Gateway Role:** The backend gateway, which securely holds the OIDC provider's client secret, performs the actual token exchange with the OIDC provider. It receives the `id_token`, `access_token`, and `refresh_token` (if applicable).
6.  **Session Creation:** The gateway then establishes a secure session for the user (e.g., by setting an HTTP-only cookie) and returns the `id_token`, `access_token`, `expires_at` timestamp, and user information (roles, tenant, etc.) to the UI.

## Why UI Stores Minimal State

Maestro UI is designed to store only the necessary authentication state in memory (e.g., `accessToken`, `idToken`, `expiresAt`, and user details). It avoids persisting sensitive tokens in local storage or session storage for enhanced security. The primary session management is handled by the backend gateway, preferably using HTTP-only cookies, which are less susceptible to client-side attacks like XSS.

This approach ensures that:

*   **Client Secrets are Protected:** The UI never handles or stores client secrets.
*   **Reduced Attack Surface:** Sensitive tokens are not persistently stored in the browser's local storage.
*   **Centralized Session Management:** The backend gateway is responsible for session lifecycle, including token refresh and invalidation.
