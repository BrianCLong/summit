import { Request, Response, NextFunction } from 'express';
import etag from 'etag';

/**
 * Middleware to handle ETag generation and 304 Not Modified responses for GET requests.
 * Express has built-in 'etag' support, but this gives explicit control and can be extended.
 */
export const httpCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    // For non-GET, we might want to disable caching explicitly
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }

  // Default Cache-Control for API
  // public, max-age=0, must-revalidate is good for fresh content that needs validation
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  // Intercept response to generate ETag
  const originalSend = res.send;

  res.send = function (body) {
    // If headers already sent, do nothing
    if (res.headersSent) {
      return originalSend.call(this, body);
    }

    // Generate ETag if not present
    if (!res.getHeader('ETag') && body) {
      const entity = typeof body === 'string' || Buffer.isBuffer(body)
        ? body
        : JSON.stringify(body);

      const generatedEtag = etag(entity);
      res.setHeader('ETag', generatedEtag);
    }

    // Check If-None-Match
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === res.getHeader('ETag')) {
      res.status(304).end();
      return this;
    }

    return originalSend.call(this, body);
  };

  next();
};
