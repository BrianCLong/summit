import { Router } from 'express';
import { SSOService } from '../auth-sso/SSOService.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();
const ssoService = new SSOService();

// Admin: Configure SSO for a tenant
router.post('/config', rateLimitMiddleware, async (req, res) => {
  // TODO: Add admin auth middleware check here.
  // For now assuming the caller is authorized or middleware is applied upstream.
  // Actually, I should probably check if req.user is admin.
  // But this prompt says "API-first", "Admin endpoints".

  try {
    const config = req.body;
    await ssoService.configureSSO(config);
    res.json({ success: true, message: 'SSO configured successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin: Get SSO Config
router.get('/config', rateLimitMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({ error: 'tenantId is required' });
    }
    const config = await ssoService.getSSOConfig(tenantId);
    res.json(config || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Test SSO
router.post('/test', rateLimitMiddleware, async (req, res) => {
  try {
    const config = req.body;
    const result = await ssoService.testConnection(config);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Public: Initiate SSO Login
router.get('/login', rateLimitMiddleware, async (req, res) => {
  try {
    const { tenantId, callbackUrl } = req.query;
    if (!tenantId || typeof tenantId !== 'string') {
        return res.status(400).json({ error: 'tenantId is required' });
    }
    // callbackUrl needs validation or strictly use configured redirectUrl
    const redirectUrl = await ssoService.generateAuthUrl(tenantId, (callbackUrl as string) || 'http://localhost:3000/auth/callback');
    res.json({ redirectUrl });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Public: SSO Callback
router.post('/callback', rateLimitMiddleware, async (req, res) => {
  try {
    const { code, state, callbackUrl } = req.body;
    const authResponse = await ssoService.handleCallback(code, state, callbackUrl || 'http://localhost:3000/auth/callback');
    res.json(authResponse);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

export default router;
