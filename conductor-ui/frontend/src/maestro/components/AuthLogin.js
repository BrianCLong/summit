import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
// Helper functions for PKCE (should ideally be in a shared utility file)
function base64URLEncode(str) {
  return btoa(String.fromCharCode(...new Uint8Array(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hash);
}
function generateRandomString(length) {
  const array = new Uint32Array(length / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-2)).join(
    '',
  );
}
export default function AuthLogin() {
  const [error, setError] = useState(null);
  const handleLogin = async (provider) => {
    setError(null);
    try {
      // These would come from environment variables or a config endpoint
      const OIDC_CLIENT_IDS = {
        auth0: 'YOUR_AUTH0_CLIENT_ID',
        azuread: 'YOUR_AZUREAD_CLIENT_ID',
        google: 'YOUR_GOOGLE_CLIENT_ID',
      };
      const OIDC_AUTHORIZATION_ENDPOINTS = {
        auth0: 'https://YOUR_AUTH0_DOMAIN/authorize',
        azuread:
          'https://login.microsoftonline.com/YOUR_AZUREAD_TENANT_ID/oauth2/v2.0/authorize',
        google: 'https://accounts.google.com/o/oauth2/v2/auth',
      };
      const OIDC_REDIRECT_URIS = {
        auth0: 'http://localhost:3000/auth/oidc/callback/auth0',
        azuread: 'http://localhost:3000/auth/oidc/callback/azuread',
        google: 'http://localhost:3000/auth/oidc/callback/google',
      };
      const clientId = OIDC_CLIENT_IDS[provider];
      const authorizationEndpoint = OIDC_AUTHORIZATION_ENDPOINTS[provider];
      const redirectUri = OIDC_REDIRECT_URIS[provider];
      if (!clientId || !authorizationEndpoint || !redirectUri) {
        throw new Error(`Missing OIDC configuration for ${provider}`);
      }
      const codeVerifier = generateRandomString(128); // 128 characters for code_verifier
      const codeChallenge = await sha256(codeVerifier);
      const state = generateRandomString(32); // Random state for CSRF protection
      // Store code_verifier and state in session storage for retrieval on callback
      sessionStorage.setItem('oauthCodeVerifier', codeVerifier);
      sessionStorage.setItem('oauthState', state);
      sessionStorage.setItem('oauthProvider', provider); // Store provider to know which callback to expect
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email', // Request necessary scopes
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
        // Add provider-specific parameters if needed (e.g., prompt=select_account for Google)
      });
      window.location.href = `${authorizationEndpoint}?${params.toString()}`;
    } catch (err) {
      console.error('Login initiation failed:', err);
      setError(err.message || 'Failed to initiate login.');
    }
  };
  return _jsx('div', {
    className:
      'flex flex-col items-center justify-center min-h-screen bg-gray-100',
    children: _jsxs('div', {
      className: 'p-8 bg-white rounded-lg shadow-md w-96',
      children: [
        _jsx('h2', {
          className: 'text-2xl font-bold text-center mb-6',
          children: 'Login to Maestro',
        }),
        error &&
          _jsx('p', {
            className: 'text-red-500 text-center mb-4',
            children: error,
          }),
        _jsx('button', {
          onClick: () => handleLogin('auth0'),
          className:
            'w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mb-3',
          children: 'Login with Auth0',
        }),
        _jsx('button', {
          onClick: () => handleLogin('azuread'),
          className:
            'w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 mb-3',
          children: 'Login with Azure AD',
        }),
        _jsx('button', {
          onClick: () => handleLogin('google'),
          className:
            'w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
          children: 'Login with Google',
        }),
      ],
    }),
  });
}
