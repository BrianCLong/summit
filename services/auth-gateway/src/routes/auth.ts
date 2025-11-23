/**
 * Authentication routes (OIDC login/logout flow)
 */

import { Router } from 'express';
import type { OIDCAuthenticator } from '../auth/oidc-authenticator.js';

export function authRouter(oidc: OIDCAuthenticator): Router {
  const router = Router();

  // Login endpoint - redirects to OIDC provider
  router.get('/login', (req, res) => {
    try {
      const state = req.query.state as string | undefined;
      const authUrl = oidc.getAuthorizationUrl(state);
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // OAuth2 callback endpoint
  router.get('/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string | undefined;

      if (!code) {
        res.status(400).json({ error: 'Missing authorization code' });
        return;
      }

      const tokenSet = await oidc.exchangeCode(code, state);

      // In production, store tokens securely (encrypted cookie, session store, etc.)
      res.json({
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        expiresIn: tokenSet.expires_in
      });
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Token refresh endpoint
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Missing refresh token' });
        return;
      }

      const tokenSet = await oidc.refreshToken(refreshToken);

      res.json({
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        expiresIn: tokenSet.expires_in
      });
    } catch (error) {
      res.status(401).json({
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Logout endpoint
  router.post('/logout', async (req, res) => {
    try {
      const { token } = req.body;

      if (token) {
        await oidc.revokeToken(token);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
