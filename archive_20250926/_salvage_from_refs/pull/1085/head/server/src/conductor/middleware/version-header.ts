// server/src/conductor/middleware/version-header.ts

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to add Conductor API version headers and trace IDs
 */
export function addConductorHeaders(req: Request, res: Response, next: NextFunction) {
  // Add version header to all Conductor API responses
  res.setHeader('X-Conductor-API-Version', 'v1');
  
  // Add trace ID if not already present
  if (!res.getHeader('X-Trace-Id')) {
    const traceId = req.headers['x-trace-id'] || randomUUID();
    res.setHeader('X-Trace-Id', traceId);
  }
  
  // Add content security headers for API responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Override JSON response to include standard error format
  const originalJson = res.json;
  res.json = function(body: any) {
    // Ensure all responses have consistent error format for 4xx/5xx
    if (res.statusCode >= 400 && body && !body.traceId) {
      body.traceId = res.getHeader('X-Trace-Id');
      
      // Standardize error format
      if (!body.code && body.error) {
        body.code = getErrorCode(res.statusCode);
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Map HTTP status codes to standard error codes
 */
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'INVALID_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'RATE_LIMIT_EXCEEDED';
    case 500: return 'INTERNAL_SERVER_ERROR';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'SERVICE_UNAVAILABLE';
    case 504: return 'GATEWAY_TIMEOUT';
    default: return 'UNKNOWN_ERROR';
  }
}