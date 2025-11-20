/**
 * Security Headers Middleware - Phase 2
 *
 * Implements comprehensive security headers including
 * CSP, HSTS, COOP, and other security controls
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

interface SecurityHeadersConfig {
  environment: 'development' | 'staging' | 'production';
  domain: string;
  reportingEndpoint?: string;
  enableReporting: boolean;
  contentSecurityPolicy: {
    enabled: boolean;
    reportOnly: boolean;
    directives: Record<string, string[]>;
  };
  strictTransportSecurity: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
}

/**
 * Security Headers Manager
 */
class SecurityHeadersManager {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig) {
    this.config = config;
  }

  /**
   * Get Helmet configuration
   */
  getHelmetConfig() {
    const isProduction = this.config.environment === 'production';

    return helmet({
      // Content Security Policy
      contentSecurityPolicy: this.config.contentSecurityPolicy.enabled
        ? {
            directives: this.buildCSPDirectives(),
            reportOnly: this.config.contentSecurityPolicy.reportOnly,
          }
        : false,

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: {
        policy: isProduction ? 'require-corp' : 'unsafe-none',
      },

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false,
      },

      // Note: Expect-CT has been deprecated and removed from helmet
      // Certificate Transparency is now handled by browsers automatically

      // Frameguard (X-Frame-Options)
      frameguard: {
        action: 'deny',
      },

      // Hide Powered-By header
      hidePoweredBy: true,

      // HTTP Strict Transport Security
      hsts: this.config.strictTransportSecurity.enabled
        ? {
            maxAge: this.config.strictTransportSecurity.maxAge,
            includeSubDomains:
              this.config.strictTransportSecurity.includeSubDomains,
            preload: this.config.strictTransportSecurity.preload,
          }
        : false,

      // IE No Open
      ieNoOpen: true,

      // No Sniff
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Permissions Policy (Feature Policy) - Disabled here, added as custom header
      permittedCrossDomainPolicies: false,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // X-XSS-Protection
      xssFilter: true,
    });
  }

  /**
   * Build Content Security Policy directives
   */
  private buildCSPDirectives(): Record<string, string[]> {
    const isProduction = this.config.environment === 'production';
    const domain = this.config.domain;

    const baseDirectives = {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'", 'https:', 'data:'],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'style-src': ["'self'", 'https:', "'unsafe-inline'"],
      'upgrade-insecure-requests': [],
    };

    // Environment-specific configurations
    if (isProduction) {
      // Production: Strict CSP
      baseDirectives['connect-src'] = ["'self'", `https://*.${domain}`];
      baseDirectives['worker-src'] = ["'self'"];
    } else {
      // Development: More permissive for hot reload, etc.
      baseDirectives['script-src'].push("'unsafe-eval'"); // For development tools
      baseDirectives['connect-src'] = [
        "'self'",
        'ws:',
        'wss:',
        'http:',
        'https:',
      ];
    }

    // Add GraphQL and API endpoints
    baseDirectives['connect-src'].push(
      `https://api.${domain}`,
      `https://graphql.${domain}`,
      `wss://graphql.${domain}`,
    );

    // Add reporting if enabled
    if (this.config.enableReporting && this.config.reportingEndpoint) {
      baseDirectives['report-uri'] = [this.config.reportingEndpoint];
      baseDirectives['report-to'] = ['csp-endpoint'];
    }

    // Merge with custom directives
    return {
      ...baseDirectives,
      ...this.config.contentSecurityPolicy.directives,
    };
  }

  /**
   * Additional custom security headers middleware
   */
  getCustomHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Server identification
      res.setHeader('Server', 'IntelGraph');

      // API versioning
      res.setHeader('X-API-Version', process.env.API_VERSION || '1.0');

      // Permissions Policy (restricts browser features)
      const permissionsPolicy = [
        'accelerometer=()',
        'autoplay=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'encrypted-media=()',
        'fullscreen=(self)',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'payment=()',
        'picture-in-picture=()',
        'publickey-credentials-get=(self)',
        'screen-wake-lock=()',
        'sync-xhr=(self)',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
      ].join(', ');
      res.setHeader('Permissions-Policy', permissionsPolicy);

      // Request ID for tracing
      const requestId =
        req.headers['x-request-id'] ||
        req.headers['x-correlation-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', requestId);

      // Rate limiting info (if available)
      if (req.rateLimit) {
        res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
        res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', req.rateLimit.reset);
      }

      // Security reporting endpoints
      if (this.config.enableReporting && this.config.reportingEndpoint) {
        const reportTo = JSON.stringify({
          group: 'csp-endpoint',
          max_age: 31536000,
          endpoints: [{ url: this.config.reportingEndpoint }],
        });
        res.setHeader('Report-To', reportTo);
      }

      // Network Error Logging (NEL)
      if (this.config.environment === 'production') {
        const nel = JSON.stringify({
          report_to: 'csp-endpoint',
          max_age: 31536000,
          include_subdomains: true,
        });
        res.setHeader('NEL', nel);
      }

      // Clear-Site-Data on logout
      if (req.path === '/auth/logout' || req.path === '/api/auth/logout') {
        res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
      }

      next();
    };
  }

  /**
   * GraphQL-specific security headers
   */
  getGraphQLHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only apply to GraphQL endpoints
      if (!req.path.includes('/graphql')) {
        return next();
      }

      // Disable caching for GraphQL responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // GraphQL-specific CORS
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-GraphQL-Operation-Name',
      );

      // Prevent GraphQL introspection in production
      if (
        this.config.environment === 'production' &&
        req.body?.query?.includes('__schema')
      ) {
        return res.status(403).json({
          errors: [
            { message: 'GraphQL introspection is disabled in production' },
          ],
        });
      }

      next();
    };
  }

  /**
   * Health check for security headers
   */
  healthCheck(): { status: 'healthy' | 'degraded'; details: any } {
    return {
      status: 'healthy',
      details: {
        csp: this.config.contentSecurityPolicy.enabled,
        hsts: this.config.strictTransportSecurity.enabled,
        reporting: this.config.enableReporting,
        environment: this.config.environment,
      },
    };
  }
}

/**
 * Factory function for creating security headers manager
 */
export function createSecurityHeadersManager(
  config: Partial<SecurityHeadersConfig>,
): SecurityHeadersManager {
  const defaultConfig: SecurityHeadersConfig = {
    environment: (process.env.NODE_ENV as any) || 'development',
    domain: process.env.DOMAIN || 'localhost',
    reportingEndpoint: process.env.CSP_REPORT_URI,
    enableReporting: process.env.NODE_ENV === 'production',
    contentSecurityPolicy: {
      enabled: true,
      reportOnly: process.env.NODE_ENV !== 'production',
      directives: {},
    },
    strictTransportSecurity: {
      enabled: process.env.NODE_ENV === 'production',
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  };

  return new SecurityHeadersManager({ ...defaultConfig, ...config });
}

/**
 * Express middleware factory
 */
export function createSecurityMiddleware(
  config?: Partial<SecurityHeadersConfig>,
) {
  const manager = createSecurityHeadersManager(config || {});

  return [
    manager.getHelmetConfig(),
    manager.getCustomHeadersMiddleware(),
    manager.getGraphQLHeadersMiddleware(),
  ];
}

export { SecurityHeadersManager, SecurityHeadersConfig };
