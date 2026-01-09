import helmet from 'helmet';
import { RequestHandler } from 'express';

interface SecurityHeadersOptions {
  enabled?: boolean;
  allowedOrigins?: string[];
  enableCsp?: boolean;
  cspReportOnly?: boolean;
}

/**
 * Baseline HTTP security headers applied across the API surface.
 * Can be disabled via SECURITY_HEADERS_ENABLED=false.
 * CSP can be toggled separately via SECURITY_HEADERS_CSP_ENABLED / SECURITY_HEADERS_CSP_REPORT_ONLY.
 */
export function securityHeaders({
  enabled = process.env.SECURITY_HEADERS_ENABLED !== 'false',
  allowedOrigins = [],
  enableCsp = process.env.SECURITY_HEADERS_CSP_ENABLED === 'true' ||
    process.env.NODE_ENV === 'production',
  cspReportOnly = process.env.SECURITY_HEADERS_CSP_REPORT_ONLY === 'true',
}: SecurityHeadersOptions = {}): RequestHandler {
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  const connectSrc = ["'self'", ...allowedOrigins, 'https://api.intelgraph.example'];

  const helmetMiddleware = helmet({
    frameguard: { action: 'deny' },
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Improved from 'no-referrer'
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    contentSecurityPolicy: enableCsp
      ? {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc,
        },
        reportOnly: cspReportOnly,
      }
      : false,
  });

  return (req, res, next) => {
    // Add Permissions-Policy header to restrict sensitive browser features
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    helmetMiddleware(req, res, next);
  };
}
