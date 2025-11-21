import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'api-version' });

export interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

export interface VersionedRequest extends Request {
  apiVersion: ApiVersion;
}

/**
 * Parse a version string (e.g., "v2.1.0" or "2.1.0") into components
 */
function parseVersion(versionStr: string): ApiVersion | null {
  const match = versionStr.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) return null;

  const major = parseInt(match[1], 10);
  const minor = match[2] ? parseInt(match[2], 10) : 0;
  const patch = match[3] ? parseInt(match[3], 10) : 0;

  return {
    major,
    minor,
    patch,
    raw: `v${major}.${minor}.${patch}`
  };
}

/**
 * Compare two versions. Returns:
 *  -1 if a < b
 *   0 if a == b
 *   1 if a > b
 */
function compareVersions(a: ApiVersion, b: ApiVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * API versioning middleware
 * Extracts version from URL path (/api/service/v2/) or API-Version header
 */
export function apiVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const versionedReq = req as VersionedRequest;

  // Default version
  let version: ApiVersion = { major: 1, minor: 0, patch: 0, raw: 'v1.0.0' };

  // 1. Check URL path for major version (e.g., /api/maestro/v2/)
  const pathVersionMatch = req.path.match(/\/v(\d+)\//);
  if (pathVersionMatch) {
    version = {
      major: parseInt(pathVersionMatch[1], 10),
      minor: 0,
      patch: 0,
      raw: `v${pathVersionMatch[1]}.0.0`
    };
  }

  // 2. Check API-Version header for full version (e.g., "v2.1.0")
  // Header takes precedence for minor/patch versions
  const headerVersion = req.headers['api-version'] as string | undefined;
  if (headerVersion) {
    const parsed = parseVersion(headerVersion);
    if (parsed) {
      // If path specified major version, use that but allow header to specify minor/patch
      if (pathVersionMatch && parsed.major === version.major) {
        version = parsed;
      } else if (!pathVersionMatch) {
        version = parsed;
      }
      // If header major version differs from path, log warning but use path version
      else if (parsed.major !== version.major) {
        logger.warn({
          path: req.path,
          pathVersion: version.major,
          headerVersion: parsed.major
        }, 'API-Version header major version differs from URL path version, using path version');
      }
    }
  }

  versionedReq.apiVersion = version;

  // Set response header to indicate which version is being used
  res.setHeader('API-Version', version.raw);

  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug({
      path: req.path,
      requestedVersion: version.raw,
      method: req.method
    }, 'API version resolved');
  }

  next();
}

/**
 * Version guard middleware - ensures minimum version
 * Usage: router.get('/endpoint', requireVersion('v2.0.0'), handler)
 */
export function requireVersion(minVersion: string) {
  const required = parseVersion(minVersion);

  if (!required) {
    throw new Error(`Invalid minimum version specified: ${minVersion}`);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const versionedReq = req as VersionedRequest;
    const current = versionedReq.apiVersion;

    if (!current) {
      res.status(500).json({
        error: 'Version middleware not applied',
        message: 'apiVersionMiddleware must be applied before requireVersion'
      });
      return;
    }

    if (compareVersions(current, required) < 0) {
      res.status(400).json({
        error: 'API version too old',
        required: required.raw,
        provided: current.raw,
        message: `This endpoint requires API version ${required.raw} or higher. You provided ${current.raw}.`
      });
      return;
    }

    next();
  };
}

/**
 * Version range middleware - ensures version is within range
 * Usage: router.get('/endpoint', requireVersionRange('v1.0.0', 'v2.0.0'), handler)
 */
export function requireVersionRange(minVersion: string, maxVersion: string) {
  const min = parseVersion(minVersion);
  const max = parseVersion(maxVersion);

  if (!min || !max) {
    throw new Error(`Invalid version range: ${minVersion} - ${maxVersion}`);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const versionedReq = req as VersionedRequest;
    const current = versionedReq.apiVersion;

    if (!current) {
      res.status(500).json({
        error: 'Version middleware not applied',
        message: 'apiVersionMiddleware must be applied before requireVersionRange'
      });
      return;
    }

    if (compareVersions(current, min) < 0 || compareVersions(current, max) > 0) {
      res.status(400).json({
        error: 'API version out of range',
        minVersion: min.raw,
        maxVersion: max.raw,
        provided: current.raw,
        message: `This endpoint requires API version between ${min.raw} and ${max.raw}. You provided ${current.raw}.`
      });
      return;
    }

    next();
  };
}

export { parseVersion, compareVersions };
