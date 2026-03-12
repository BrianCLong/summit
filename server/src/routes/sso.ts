
import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { SSOService } from '../services/SSOService.js';
import { tenantService } from '../services/TenantService.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { z } from 'zod';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router = Router();
const ssoService = new SSOService();

/**
 * Helper to ensure a parameter is a single string.
 * Prevents HTTP Parameter Pollution (HPP) where an attacker might provide multiple
 * values for the same key (e.g., ?state=a&state=b) to bypass validation logic.
 */
function toSingleString(val: any): string | undefined {
  if (Array.isArray(val)) {
    return typeof val[0] === 'string' ? val[0] : undefined;
  }
  return typeof val === 'string' ? val : undefined;
}

// Validation schemas
const ssoConfigSchema = z.object({
  type: z.enum(['oidc', 'saml']),
  name: z.string(),
  // OIDC
  issuer: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  userInfoEndpoint: z.string().optional(),
  jwksUri: z.string().optional(),
  // SAML
  entryPoint: z.string().optional(),
  issuerString: z.string().optional(),
  cert: z.string().optional(),
  // Mapping
  groupMap: z.record(z.array(z.string())).optional(),
  attributeMap: z.object({
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    groups: z.string().optional(),
  }).optional(),
});

/**
 * @route POST /tenants/:id/sso
 * @desc Configure SSO for a tenant
 * @access Private (Admin of Tenant or System Admin)
 */
router.post('/tenants/:id/sso', ensureAuthenticated, rateLimitMiddleware, asyncHandler(async (req, res) => {
  const id = toSingleString(req.params.id);
  if (!id) return res.status(400).json({ error: 'Tenant ID required' });

  // Strict Access Control:
  const user = req.user as any;
  if (user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized: Admin role required' });
  }

  // Check if user belongs to this tenant
  if (user?.tenantId !== id) {
    return res.status(403).json({ error: 'Unauthorized: Access restricted to tenant members' });
  }

  const validated = ssoConfigSchema.parse(req.body);

  // Get current tenant config
  const tenant = await tenantService.getTenant(id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const newConfig = {
    ...tenant.config,
    sso: validated
  };

  // Direct update via pool
  const { getPostgresPool } = await import('../config/database.js');
  const pool = getPostgresPool();
  await pool.query('UPDATE tenants SET config = $1 WHERE id = $2', [newConfig, id]);

  logger.info(`Updated SSO config for tenant ${id} by user ${req.user!.id}`);
  return res.json({ success: true, config: validated });
}));

/**
 * @route GET /auth/sso/:tenantId/login
 * @desc Initiate SSO login
 * @access Public
 */
router.get('/auth/sso/:tenantId/login', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const tenantId = toSingleString(req.params.tenantId);
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const { url, state } = await ssoService.getAuthUrl(tenantId, config.baseUrl || baseUrl);

    // Set state cookie for CSRF protection
    res.cookie('sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 * 1000 // 5 minutes
    });

    return res.redirect(url);
  } catch (e: any) {
    logger.error('SSO Login Error', e);
    return res.status(400).json({ error: e.message });
  }
}));

/**
 * @route POST /auth/sso/:tenantId/callback
 * @desc Handle SSO callback
 * @access Public
 */
router.post('/auth/sso/:tenantId/callback', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const tenantId = toSingleString(req.params.tenantId);
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // CSRF / State Validation
  const stateCookie = req.cookies['sso_state'];
  const stateParam =
    toSingleString(req.body.RelayState) ||
    toSingleString(req.body.state) ||
    toSingleString(req.query.state) ||
    toSingleString(req.query.RelayState);

  if (!stateCookie || !stateParam || stateCookie !== stateParam) {
    logger.warn(`SSO State mismatch or missing. Cookie: ${stateCookie ? 'present' : 'missing'}, Param: ${stateParam ? 'present' : 'missing'}`);
    return res.status(403).send('Authentication failed: State mismatch (CSRF protection)');
  }

  // Clear state cookie
  res.clearCookie('sso_state');

  try {
    const { user, token, refreshToken } = await ssoService.handleCallback(tenantId, config.baseUrl || baseUrl, req.body, req.query);

    // Set session cookies
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      sameSite: 'lax'
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      sameSite: 'lax'
    });

    const relayState = toSingleString(req.query.RelayState || req.body.RelayState);
    if (relayState) {
      return res.redirect(relayState);
    }
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);

  } catch (e: any) {
    logger.error('SSO Callback Error', e);
    return res.status(401).send(`Authentication failed: ${e.message}`);
  }
}));

// Handle GET callback
router.get('/auth/sso/:tenantId/callback', rateLimitMiddleware, asyncHandler(async (req, res) => {
  const tenantId = toSingleString(req.params.tenantId);
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const stateCookie = req.cookies['sso_state'];
  const stateParam = toSingleString(req.query.state) || toSingleString(req.query.RelayState);

  if (!stateCookie || !stateParam || stateCookie !== stateParam) {
    logger.warn(`SSO State mismatch or missing. Cookie: ${stateCookie ? 'present' : 'missing'}, Param: ${stateParam ? 'present' : 'missing'}`);
    return res.status(403).send('Authentication failed: State mismatch (CSRF protection)');
  }

  res.clearCookie('sso_state');

  try {
    const { user, token, refreshToken } = await ssoService.handleCallback(tenantId, config.baseUrl || baseUrl, req.body, req.query);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    const relayState = toSingleString(req.query.RelayState || req.body.RelayState);
    if (relayState) {
      return res.redirect(relayState);
    }
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
  } catch (e: any) {
    logger.error('SSO Callback Error', e);
    return res.status(401).send(`Authentication failed: ${e.message}`);
  }
}));

export default router;
