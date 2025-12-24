import { Router } from 'express';
import { SSOService } from '../auth/sso/SSOService.js';

const router = Router();
const ssoService = new SSOService();

router.get('/providers', async (req, res) => {
  try {
    const providers = await ssoService.getAllProviders();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:provider/login', async (req, res) => {
  const { provider } = req.params;
  // Use referer or configured base URL, but for now simple construction
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/auth/sso/${provider}/callback`;

  try {
    const { url } = await ssoService.handleLogin(provider, redirectUri);
    res.redirect(url);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const params = req.query as Record<string, string>;
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/auth/sso/${provider}/callback`;

  try {
    const result = await ssoService.handleCallback(provider, params, redirectUri);
    // In a real app, redirection to frontend with token is typical.
    // For API-only prompt compliance: return JSON.
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

export default router;
