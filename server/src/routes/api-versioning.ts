/**
 * API Versioning Router
 *
 * Implements versioned API namespaces (/v1/, /v2/) for GA-grade API stability.
 * Breaking changes require version bumps.
 *
 * SOC 2 Controls:
 * - CC7.1: System change detection
 * - CC7.2: System change management
 * - PI1.1: Data processing controls
 *
 * @module api-versioning
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { appLogger } from '../observability/request-context.js';

// API Version definitions
export const API_VERSIONS = {
  V1: '1' as const,
  V1_1: '1.1' as const,
  V2: '2' as const,
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

// Current stable and latest versions
export const CURRENT_STABLE_VERSION: ApiVersion = API_VERSIONS.V1_1;
export const LATEST_VERSION: ApiVersion = API_VERSIONS.V2;
export const DEPRECATED_VERSIONS: ApiVersion[] = [API_VERSIONS.V1];

// Zod schema for version validation
const ApiVersionSchema = z.enum(['1', '1.1', '2']);

/**
 * Version metadata for documentation and deprecation notices
 */
export interface VersionMetadata {
  version: ApiVersion;
  status: 'stable' | 'beta' | 'deprecated';
  releaseDate: string;
  sunsetDate?: string;
  changelog?: string;
  breakingChanges?: string[];
}

export const VERSION_METADATA: Record<ApiVersion, VersionMetadata> = {
  '1': {
    version: '1',
    status: 'deprecated',
    releaseDate: '2024-06-01',
    sunsetDate: '2025-06-01',
    changelog: '/docs/changelog/v1.md',
    breakingChanges: [],
  },
  '1.1': {
    version: '1.1',
    status: 'stable',
    releaseDate: '2024-12-01',
    changelog: '/docs/changelog/v1.1.md',
    breakingChanges: [
      'GovernanceVerdict is now mandatory in all DataEnvelope responses',
      'isSimulated flag is now required on all data outputs',
    ],
  },
  '2': {
    version: '2',
    status: 'beta',
    releaseDate: '2025-01-15',
    changelog: '/docs/changelog/v2.md',
    breakingChanges: [
      'All endpoints return DataEnvelope wrapper',
      'Provenance is mandatory on all responses',
      'New authentication flow with PKCE',
    ],
  },
};

/**
 * Request with API version attached
 */
export interface VersionedRequest extends Request {
  apiVersion: ApiVersion;
  apiVersionMetadata: VersionMetadata;
}

/**
 * Middleware to extract and validate API version from request
 *
 * Supports multiple version sources:
 * 1. URL path: /v1/..., /v2/...
 * 2. Header: X-IG-API-Version
 * 3. Query param: ?api_version=1.1
 *
 * Defaults to CURRENT_STABLE_VERSION if not specified.
 */
export function apiVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = appLogger.child({ component: 'api-versioning' });

  // Try to extract version from multiple sources
  let version: string | undefined;
  let source: 'path' | 'header' | 'query' | 'default' = 'default';

  // 1. Check URL path first (/v1/..., /v2/...)
  const pathMatch = req.path.match(/^\/v(\d+(?:\.\d+)?)\//);
  if (pathMatch) {
    version = pathMatch[1];
    source = 'path';
  }

  // 2. Check header
  if (!version) {
    const headerVersion = req.headers['x-ig-api-version'];
    if (typeof headerVersion === 'string') {
      version = headerVersion;
      source = 'header';
    }
  }

  // 3. Check query param
  if (!version && typeof (req.query.api_version as any) === 'string') {
    version = (req.query.api_version as any);
    source = 'query';
  }

  // 4. Default to stable version
  if (!version) {
    version = CURRENT_STABLE_VERSION;
    source = 'default';
  }

  // Validate version
  const parseResult = ApiVersionSchema.safeParse(version);
  if (!parseResult.success) {
    logger.warn({ version, source }, 'Invalid API version requested');
    res.status(400).json({
      error: 'Invalid API version',
      message: `Version '${version}' is not supported. Valid versions: ${Object.values(API_VERSIONS).join(', ')}`,
      supportedVersions: Object.values(API_VERSIONS),
    });
    return;
  }

  const validVersion = parseResult.data as ApiVersion;
  const metadata = VERSION_METADATA[validVersion];

  // Attach version to request
  (req as VersionedRequest).apiVersion = validVersion;
  (req as VersionedRequest).apiVersionMetadata = metadata;

  // Set version header in response
  res.setHeader('X-IG-API-Version', validVersion);
  res.setHeader('X-IG-API-Version-Status', metadata.status);

  // Add deprecation warning headers
  if (metadata.status === 'deprecated') {
    res.setHeader('Deprecation', `date="${metadata.sunsetDate}"`);
    res.setHeader('Sunset', metadata.sunsetDate || 'TBD');
    res.setHeader(
      'Link',
      `</api/v${CURRENT_STABLE_VERSION}/>; rel="successor-version"`
    );

    logger.warn(
      {
        version: validVersion,
        sunsetDate: metadata.sunsetDate,
        correlationId: (req as any).correlationId,
      },
      'Deprecated API version used'
    );
  }

  // Log version usage for analytics
  logger.debug({
    version: validVersion,
    source,
    path: req.path,
    correlationId: (req as any).correlationId,
  }, 'API version resolved');

  next();
}

/**
 * Create a versioned router with automatic version prefix stripping
 *
 * @param version - API version for this router
 * @returns Express Router configured for the version
 */
export function createVersionedRouter(version: ApiVersion): Router {
  const router = Router();

  // Add version-specific middleware
  router.use((req: Request, res: Response, next: NextFunction) => {
    (req as VersionedRequest).apiVersion = version;
    (req as VersionedRequest).apiVersionMetadata = VERSION_METADATA[version];
    res.setHeader('X-IG-API-Version', version);
    next();
  });

  return router;
}

/**
 * Version gate middleware - ensures request is using required minimum version
 *
 * @param minVersion - Minimum required API version
 */
export function requireMinVersion(minVersion: ApiVersion) {
  return (req: Request, res: Response, next: NextFunction) => {
    const versionedReq = req as VersionedRequest;
    const currentVersion = parseFloat(versionedReq.apiVersion || '1');
    const requiredVersion = parseFloat(minVersion);

    if (currentVersion < requiredVersion) {
      res.status(426).json({
        error: 'Upgrade Required',
        message: `This endpoint requires API version ${minVersion} or higher. Current version: ${versionedReq.apiVersion}`,
        currentVersion: versionedReq.apiVersion,
        requiredVersion: minVersion,
        upgradeInfo: VERSION_METADATA[minVersion],
      });
      return;
    }

    next();
  };
}

/**
 * Version compatibility adapter
 *
 * Adapts responses between API versions for backwards compatibility.
 *
 * @param transformers - Version-specific response transformers
 */
export function versionAdapter<T>(
  transformers: Partial<Record<ApiVersion, (data: T) => unknown>>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const versionedReq = req as VersionedRequest;
    const originalJson = res.json.bind(res);

    res.json = function (data: T) {
      const version = versionedReq.apiVersion || CURRENT_STABLE_VERSION;
      const transformer = transformers[version];

      if (transformer) {
        return originalJson(transformer(data));
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Version discovery endpoint
 *
 * Returns information about supported API versions.
 */
export const versionDiscoveryRouter = Router();

versionDiscoveryRouter.get('/versions', (_req: Request, res: Response) => {
  res.json({
    currentStable: CURRENT_STABLE_VERSION,
    latest: LATEST_VERSION,
    versions: VERSION_METADATA,
    deprecated: DEPRECATED_VERSIONS,
    documentation: '/api-docs',
  });
});

versionDiscoveryRouter.get(
  '/versions/:version',
  (req: Request, res: Response) => {
    const version = req.params.version as ApiVersion;
    const metadata = VERSION_METADATA[version];

    if (!metadata) {
      res.status(404).json({
        error: 'Version not found',
        supportedVersions: Object.values(API_VERSIONS),
      });
      return;
    }

    res.json(metadata);
  }
);

/**
 * Main API versioning router setup
 *
 * Creates the /v1 and /v2 namespace routers.
 */
export function setupVersionedApi(): {
  v1Router: Router;
  v2Router: Router;
  versionMiddleware: typeof apiVersionMiddleware;
  discoveryRouter: Router;
} {
  const v1Router = createVersionedRouter(API_VERSIONS.V1_1);
  const v2Router = createVersionedRouter(API_VERSIONS.V2);

  return {
    v1Router,
    v2Router,
    versionMiddleware: apiVersionMiddleware,
    discoveryRouter: versionDiscoveryRouter,
  };
}

export default {
  API_VERSIONS,
  CURRENT_STABLE_VERSION,
  LATEST_VERSION,
  DEPRECATED_VERSIONS,
  VERSION_METADATA,
  apiVersionMiddleware,
  createVersionedRouter,
  requireMinVersion,
  versionAdapter,
  versionDiscoveryRouter,
  setupVersionedApi,
};
