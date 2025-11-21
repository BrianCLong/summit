/**
 * API Version Middleware
 * Handles version detection from URL and headers
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response, NextFunction } from 'express';
import { versionRegistry } from './version-registry.js';
import { logger } from '../utils/logger.js';

export interface VersionContext {
  requestedVersion: string;
  resolvedVersion: string;
  isDeprecated: boolean;
  isSunset: boolean;
  warnings: string[];
}

/**
 * Extract version from URL path
 * Supports patterns like /v1/graphql, /api/v2/entities
 */
function extractVersionFromPath(path: string): string | null {
  const versionMatch = path.match(/\/v(\d+(?:\.\d+)?)/);
  return versionMatch ? `v${versionMatch[1]}` : null;
}

/**
 * Extract version from Accept header
 * Supports: application/vnd.intelgraph.v1+json
 */
function extractVersionFromHeader(acceptHeader: string): string | null {
  const versionMatch = acceptHeader.match(/vnd\.intelgraph\.v(\d+(?:\.\d+)?)/);
  return versionMatch ? `v${versionMatch[1]}` : null;
}

/**
 * Extract version from custom API-Version header
 */
function extractVersionFromApiHeader(apiVersionHeader: string): string | null {
  if (!apiVersionHeader) return null;

  // Support both "v1" and "1" formats
  const normalized = apiVersionHeader.trim().toLowerCase();
  return normalized.startsWith('v') ? normalized : `v${normalized}`;
}

/**
 * Middleware to detect and validate API version
 */
export function versionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Priority order for version detection:
    // 1. URL path (/v1/graphql)
    // 2. API-Version header (API-Version: v1)
    // 3. Accept header (Accept: application/vnd.intelgraph.v1+json)
    // 4. Default version

    let requestedVersion: string | null = null;
    let detectionMethod = 'default';

    // Try URL path first
    requestedVersion = extractVersionFromPath(req.path);
    if (requestedVersion) {
      detectionMethod = 'url';
    }

    // Try API-Version header
    if (!requestedVersion && req.headers['api-version']) {
      requestedVersion = extractVersionFromApiHeader(
        req.headers['api-version'] as string,
      );
      if (requestedVersion) {
        detectionMethod = 'api-version-header';
      }
    }

    // Try Accept header
    if (!requestedVersion && req.headers.accept) {
      requestedVersion = extractVersionFromHeader(req.headers.accept);
      if (requestedVersion) {
        detectionMethod = 'accept-header';
      }
    }

    // Fall back to default version
    if (!requestedVersion) {
      requestedVersion = versionRegistry.getDefaultVersion();
      detectionMethod = 'default';
    }

    // Validate the version exists
    const versionInfo = versionRegistry.getVersion(requestedVersion);
    if (!versionInfo) {
      logger.warn({
        message: 'Invalid API version requested',
        requestedVersion,
        detectionMethod,
        path: req.path,
      });

      return res.status(400).json({
        error: 'invalid_api_version',
        message: `API version '${requestedVersion}' is not supported`,
        supportedVersions: versionRegistry
          .getActiveVersions()
          .map((v) => v.version),
      });
    }

    // Check if version is sunset
    if (versionRegistry.isSunset(requestedVersion)) {
      logger.warn({
        message: 'Sunset API version requested',
        version: requestedVersion,
        path: req.path,
      });

      return res.status(410).json({
        error: 'api_version_sunset',
        message: `API version '${requestedVersion}' is no longer supported`,
        latestVersion: versionRegistry.getLatestVersion(),
        migrationGuide: `/docs/migrations/${requestedVersion}-to-${versionRegistry.getLatestVersion()}`,
      });
    }

    // Build version context
    const context: VersionContext = {
      requestedVersion,
      resolvedVersion: requestedVersion,
      isDeprecated: versionRegistry.isDeprecated(requestedVersion),
      isSunset: versionRegistry.isSunset(requestedVersion),
      warnings: [],
    };

    // Add deprecation warning
    if (context.isDeprecated) {
      const warning = versionRegistry.getDeprecationWarning(requestedVersion);
      if (warning) {
        context.warnings.push(warning);
        res.setHeader('X-API-Warn', warning);
        res.setHeader('X-API-Deprecation', 'true');
        res.setHeader('X-API-Sunset-Date', versionInfo.sunsetDate?.toISOString() || 'TBD');
      }
    }

    // Add version headers to response
    res.setHeader('X-API-Version', context.resolvedVersion);
    res.setHeader('X-API-Latest-Version', versionRegistry.getLatestVersion());
    res.setHeader('X-API-Version-Detection', detectionMethod);

    // Attach version context to request
    (req as any).apiVersion = context;

    logger.debug({
      message: 'API version detected',
      version: context.resolvedVersion,
      method: detectionMethod,
      deprecated: context.isDeprecated,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error({
      message: 'Error in version middleware',
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    next(error);
  }
}

/**
 * Middleware to enforce specific API version
 */
export function requireVersion(requiredVersion: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = (req as any).apiVersion as VersionContext;

    if (!context || context.resolvedVersion !== requiredVersion) {
      return res.status(400).json({
        error: 'version_mismatch',
        message: `This endpoint requires API version ${requiredVersion}`,
        currentVersion: context?.resolvedVersion,
      });
    }

    next();
  };
}

/**
 * Middleware to block deprecated versions
 */
export function blockDeprecatedVersions(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const context = (req as any).apiVersion as VersionContext;

  if (context?.isDeprecated && process.env.BLOCK_DEPRECATED_VERSIONS === 'true') {
    return res.status(426).json({
      error: 'deprecated_version',
      message: `API version ${context.resolvedVersion} is deprecated`,
      latestVersion: versionRegistry.getLatestVersion(),
      upgradeRequired: true,
    });
  }

  next();
}

/**
 * Get version context from request
 */
export function getVersionContext(req: Request): VersionContext | undefined {
  return (req as any).apiVersion;
}
