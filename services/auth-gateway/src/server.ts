/**
 * Authentication Gateway for Agentic Mesh
 *
 * Provides:
 * - OIDC/OAuth2 authentication for human operators
 * - mTLS authentication for service-to-service communication
 * - Token validation and enrichment with ABAC attributes
 * - Integration with policy-enforcer for authorization
 */

import express, { Request, Response, NextFunction } from 'express';
import { pinoHttp } from 'pino-http';
import pino from 'pino';
import { OIDCAuthenticator } from './auth/oidc-authenticator.js';
import { ServiceAuthenticator } from './auth/service-authenticator.js';
import { AuthContextEnricher } from './auth/context-enricher.js';
import { PolicyClient } from './clients/policy-client.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { proxyRouter } from './routes/proxy.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined
});

const app = express();

// Request logging
app.use(pinoHttp({ logger }));

// Parse JSON bodies
app.use(express.json());

// Initialize authentication components
const oidcAuthenticator = new OIDCAuthenticator({
  issuerUrl: process.env.OIDC_ISSUER_URL || '',
  clientId: process.env.OIDC_CLIENT_ID || '',
  clientSecret: process.env.OIDC_CLIENT_SECRET || '',
  redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:8443/auth/callback',
  scopes: ['openid', 'profile', 'email']
});

const serviceAuthenticator = new ServiceAuthenticator({
  trustBundlePath: process.env.SPIRE_TRUST_BUNDLE_PATH || '/var/run/spire/bundle.pem',
  validateSPIFFEID: true
});

const contextEnricher = new AuthContextEnricher({
  tenantServiceUrl: process.env.TENANT_REGISTRY_URL || 'http://tenant-registry.mesh-control:8083'
});

const policyClient = new PolicyClient({
  policyEnforcerUrl: process.env.POLICY_ENFORCER_URL || 'http://policy-enforcer.mesh-control:8081'
});

// Health check routes (no auth required)
app.use('/health', healthRouter);

// Auth routes (login, callback, logout)
app.use('/auth', authRouter(oidcAuthenticator));

// Authentication middleware
// Tries OIDC token first, then mTLS service auth
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth for health checks and auth routes
    if (req.path.startsWith('/health') || req.path.startsWith('/auth')) {
      return next();
    }

    // Try OIDC token auth (for human operators)
    const authHeader = req.headers.authorization;
    let authContext;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const identity = await oidcAuthenticator.validateToken(token);
      authContext = await contextEnricher.enrichHumanIdentity(identity);
    }
    // Try mTLS service auth
    else if (req.socket && (req.socket as any).getPeerCertificate) {
      const cert = (req.socket as any).getPeerCertificate();
      const identity = await serviceAuthenticator.validateCertificate(cert);
      authContext = await contextEnricher.enrichServiceIdentity(identity);
    }
    // No valid authentication
    else {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authentication credentials provided'
      });
      return;
    }

    // Attach auth context to request
    (req as any).authContext = authContext;

    logger.info({
      authContext,
      path: req.path,
      method: req.method
    }, 'Request authenticated');

    next();
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
});

// Authorization middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for health checks and auth routes
    if (req.path.startsWith('/health') || req.path.startsWith('/auth')) {
      return next();
    }

    const authContext = (req as any).authContext;

    if (!authContext) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Determine resource and action from request
    const resource = extractResource(req);
    const action = extractAction(req);

    // Check authorization with policy enforcer
    const decision = await policyClient.authorize({
      subject: authContext,
      resource,
      action,
      context: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    });

    if (!decision.allowed) {
      logger.warn({
        authContext,
        resource,
        action,
        reason: decision.reason
      }, 'Authorization denied');

      res.status(403).json({
        error: 'Forbidden',
        message: decision.reason || 'Access denied by policy'
      });
      return;
    }

    logger.info({
      authContext,
      resource,
      action
    }, 'Request authorized');

    next();
  } catch (error) {
    logger.error({ error }, 'Authorization failed');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authorization check failed'
    });
  }
});

// Proxy routes to backend services
app.use('/', proxyRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, req }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

// Start server
const PORT = process.env.PORT || 8443;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Auth Gateway started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

/**
 * Extract resource identifier from request
 */
function extractResource(req: Request): string {
  // Map request path to resource type
  const pathParts = req.path.split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return 'mesh:*';
  }

  const [service, ...rest] = pathParts;

  if (rest.length > 0) {
    return `mesh:${service}:${rest[0]}`;
  }

  return `mesh:${service}`;
}

/**
 * Extract action from request method
 */
function extractAction(req: Request): string {
  const methodMap: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete'
  };

  return methodMap[req.method] || 'execute';
}
