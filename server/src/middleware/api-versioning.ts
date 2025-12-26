import { Request, Response, NextFunction } from 'express';

export const SUPPORTED_VERSIONS = ['v1', 'v2'];
export const DEFAULT_VERSION = 'v1';

export function apiVersioningMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerVersion = (req.headers['x-api-version'] as string | undefined)?.toLowerCase();
  const resolvedVersion = headerVersion || DEFAULT_VERSION;

  if (!SUPPORTED_VERSIONS.includes(resolvedVersion)) {
    res.status(400).json({
      error: 'unsupported_version',
      message: 'Requested API version is not supported',
      supported: SUPPORTED_VERSIONS,
      default: DEFAULT_VERSION,
    });
    return;
  }

  (req as any).apiVersion = resolvedVersion;

  if (resolvedVersion === 'v1') {
    res.setHeader('X-API-Deprecated', 'false');
  }

  if (resolvedVersion === 'v1' && headerVersion) {
    res.setHeader('X-API-Deprecation-Notice', 'v1 is stable; migrate to v2 when available');
  }

  next();
}

export function buildVersionResponse() {
  return {
    supported: SUPPORTED_VERSIONS,
    default: DEFAULT_VERSION,
    deprecated: ['v0'],
  };
}
