import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export interface VersionedRequest extends Request {
  apiVersion: {
    major: number;
    minor: number;
    patch: number;
    raw: string;
  };
}

/**
 * API versioning middleware
 * Extracts version from URL path (/api/service/v2/) or API-Version header
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const versionedReq = req as VersionedRequest;

  // 1. Check URL path for major version (e.g., /api/maestro/v2/)
  const pathVersionMatch = req.path.match(/\/v(\d+)\//);

  // 2. Check API-Version header for full version (e.g., "v2.1.0")
  const headerVersion = req.headers['api-version'] as string;

  let version = { major: 1, minor: 0, patch: 0, raw: 'v1.0.0' };

  if (pathVersionMatch) {
    version.major = parseInt(pathVersionMatch[1], 10);
    version.raw = `v${version.major}.0.0`;
  }

  if (headerVersion) {
    const parsed = parseVersion(headerVersion);
    if (parsed) {
      version = parsed;
    }
  }

  versionedReq.apiVersion = version;

  // Set response header to indicate which version is being used
  res.setHeader('API-Version', version.raw);

  logger.debug({
    path: req.path,
    requestedVersion: version.raw,
    method: req.method
  }, 'API version resolved');

  next();
}

function parseVersion(versionStr: string): { major: number; minor: number; patch: number; raw: string } | null {
  const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: `v${match[1]}.${match[2]}.${match[3]}`
  };
}

/**
 * Version guard middleware - ensures minimum version
 */
export function requireVersion(minVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const versionedReq = req as VersionedRequest;
    const required = parseVersion(minVersion);

    if (!required) {
      return res.status(500).json({ error: 'Invalid version configuration' });
    }

    const current = versionedReq.apiVersion;

    if (current.major < required.major ||
        (current.major === required.major && current.minor < required.minor) ||
        (current.major === required.major && current.minor === required.minor && current.patch < required.patch)) {
      return res.status(400).json({
        error: 'API version too old',
        required: minVersion,
        provided: current.raw,
        message: `This endpoint requires API version ${minVersion} or higher. You provided ${current.raw}.`
      });
    }

    next();
  };
}
