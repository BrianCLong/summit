import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export interface VersionedRequest extends Request {
  apiVersion: {
    major: number;
    minor: number;
    patch: number;
    raw: string;
    isDeprecated?: boolean;
    isSunset?: boolean;
    sunsetDate?: string | null;
    warnings?: string[];
  };
}

interface VersionRegistry {
  current: string;
  latest: string;
  default: string;
  supported: string[];
  deprecated: string[];
  sunset: string[];
  versions: Record<string, any>;
}

/**
 * Load version registry from file
 * Part of GA-E3: API Contracts initiative
 */
function loadVersionRegistry(): VersionRegistry | null {
  try {
    const registryPath = path.join(process.cwd(), 'api-schemas/registry.json');
    if (fs.existsSync(registryPath)) {
      const content = fs.readFileSync(registryPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error: any) {
    logger.warn({ error }, 'Failed to load version registry, using defaults');
  }
  return null;
}

/**
 * API versioning middleware
 * Extracts version from URL path (/api/v1/), API-Version header, or Accept-Version header
 * Enhanced for GA-E3: API Contracts with deprecation and sunset support
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const versionedReq = req as VersionedRequest;
  const registry = loadVersionRegistry();

  // 1. Check URL path for major version (e.g., /api/v1/, /api/maestro/v2/)
  const pathVersionMatch = req.path.match(/\/v(\d+)\//);

  // 2. Check API-Version header for full version (e.g., "v2.1.0")
  const headerVersion = req.headers['api-version'] as string;

  // 3. Check Accept-Version header (e.g., "v1")
  const acceptVersion = req.headers['accept-version'] as string;

  let version = { major: 1, minor: 0, patch: 0, raw: 'v1.0.0' };
  let detectionMethod: 'url' | 'header' | 'default' = 'default';

  if (pathVersionMatch) {
    version.major = parseInt(pathVersionMatch[1], 10);
    version.raw = `v${version.major}.0.0`;
    detectionMethod = 'url';
  } else if (headerVersion) {
    const parsed = parseVersion(headerVersion);
    if (parsed) {
      version = parsed;
      detectionMethod = 'header';
    }
  } else if (acceptVersion) {
    const parsed = parseVersion(acceptVersion);
    if (parsed) {
      version = parsed;
      detectionMethod = 'header';
    }
  }

  // Check registry for deprecation/sunset status
  const versionKey = `v${version.major}`;
  const isDeprecated = registry?.deprecated.includes(versionKey) || false;
  const isSunset = registry?.sunset.includes(versionKey) || false;
  const versionInfo = registry?.versions[versionKey];
  const sunsetDate = versionInfo?.sunsetDate || null;
  const latestVersion = registry?.latest || 'v1';
  const warnings: string[] = [];

  if (isDeprecated && sunsetDate) {
    warnings.push(
      `API version ${versionKey} is deprecated and will be sunset on ${sunsetDate}. Please upgrade to ${latestVersion}.`
    );
  }

  if (isSunset) {
    warnings.push(
      `API version ${versionKey} has been sunset. Please upgrade to ${latestVersion}.`
    );
  }

  versionedReq.apiVersion = {
    ...version,
    isDeprecated,
    isSunset,
    sunsetDate,
    warnings,
  };

  // Set response headers
  res.setHeader('X-API-Version', version.raw);
  res.setHeader('X-API-Latest-Version', latestVersion);
  res.setHeader('X-API-Version-Detection', detectionMethod);
  res.setHeader('X-API-Deprecation', isDeprecated ? 'true' : 'false');

  if (sunsetDate) {
    res.setHeader('X-API-Sunset-Date', sunsetDate);
  }

  if (warnings.length > 0) {
    res.setHeader('X-API-Warn', warnings.join('; '));
  }

  logger.debug({
    path: req.path,
    requestedVersion: version.raw,
    method: req.method,
    detectionMethod,
    isDeprecated,
    isSunset,
  }, 'API version resolved');

  // Block sunset versions (HTTP 410 Gone)
  if (isSunset) {
    return res.status(410).json({
      error: 'version_sunset',
      message: `API version ${versionKey} has been sunset`,
      currentVersion: versionKey,
      latestVersion,
      migrationGuide: `https://docs.summit.io/api/${versionKey}-to-${latestVersion}-migration`,
    });
  }

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
