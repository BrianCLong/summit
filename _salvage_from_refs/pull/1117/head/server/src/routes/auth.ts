import express, { Request, Response } from 'express';
import OIDCAuthService from '../services/OIDCAuthService.js';
import AuthService from '../services/AuthService.js';

const router = express.Router();
const oidc = new OIDCAuthService();
const auth = new AuthService();

// Begin OIDC login
router.get('/login/:provider', (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    const url = oidc.generateAuthUrl(provider);
    res.redirect(url);
  } catch (e: any) {
    res.status(400).json({ error: 'invalid_request', message: e.message });
  }
});

// OAuth callback endpoint
router.get('/callback/:provider', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code) return res.status(400).json({ error: 'invalid_request', message: 'code missing' });

    const user = await oidc.handleCallback(provider, code, state);

    // Issue local session token
    const session = await auth.loginOIDC(user.email);
    res.json({ ok: true, user: session.user, token: session.token, refreshToken: session.refreshToken });
  } catch (e: any) {
    res.status(500).json({ error: 'auth_failed', message: e.message });
  }
});

// SCIM provisioning (create/update/deactivate)
router.post('/scim/v2/Users', async (req: Request, res: Response) => {
  await oidc.handleSCIMProvisioning(req, res);
});

export default router;

