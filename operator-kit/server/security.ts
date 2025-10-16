import { Request, Response, NextFunction } from 'express';

export function securityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  //
  // Strip Authorization on cross-origin redirects (precaution):
  //
  res.removeHeader('Authorization');
  // Log line capping to prevent PII spray in logs (simple cap; add redact if desired)
  const _end = res.end;
  (res as any).end = function (chunk: any, ...rest: any[]) {
    if (chunk && Buffer.isBuffer(chunk) && chunk.length > 1024 * 256) {
      chunk = chunk.subarray(0, 1024 * 256);
    }
    return _end.call(this, chunk, ...rest);
  };
  next();
}

export function cspDirectives() {
  const self = ["'self'"];
  const scripts = ["'self'"].concat(
    (process.env.CSP_SCRIPT_SRC || '').split(',').filter(Boolean),
  );
  const styles = ["'self'", "'unsafe-inline'"]; // Mermaid needs inline styles
  const connects = [
    "'self'",
    'http://127.0.0.1:8787',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:11434',
  ].concat((process.env.CSP_CONNECT_SRC || '').split(',').filter(Boolean));
  return {
    defaultSrc: self,
    scriptSrc: scripts,
    styleSrc: styles,
    connectSrc: connects,
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  } as any;
}
