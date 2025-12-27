import { Request, Response, NextFunction, Router } from 'express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Supported API versions for the IntelGraph platform.
 * Follows semantic versioning with major.minor format.
 */
export enum APIVersion {
  /** API Version 1.0 - Initial release */
  V1 = 'v1',
  /** API Version 1.1 - Minor enhancements */
  V1_1 = 'v1.1',
  /** API Version 2.0 - Major breaking changes */
  V2 = 'v2',
  /** API Version 3.0 - Current stable version */
  V3 = 'v3',
  /** Latest API version (alias for most recent stable) */
  LATEST = 'v3',
}

/**
 * Custom MIME type for versioned API responses.
 * Format: application/vnd.intelgraph.{version}+json
 */
const VENDOR_MIME_PREFIX = 'application/vnd.intelgraph.';
const VENDOR_MIME_SUFFIX = '+json';

/**
 * Extended Express Request with API version metadata.
 */
export interface VersionedRequest extends Request {
  /** Resolved API version for this request */
  apiVersion: APIVersion;
  /** Original version string from request (may differ from resolved version) */
  requestedVersion?: string;
}

/**
 * Configuration for version deprecation warnings.
 */
export interface DeprecationConfig {
  /** API version being deprecated */
  version: APIVersion;
  /** Date when the version will be removed (sunset date) */
  sunsetDate: Date;
  /** Optional custom message for deprecation notice */
  message?: string;
  /** URL to migration guide or documentation */
  migrationGuide?: string;
}

/**
 * Result of schema version comparison.
 */
export interface SchemaVersionDiff {
  /** Source version being compared from */
  fromVersion: string;
  /** Target version being compared to */
  toVersion: string;
  /** Paths that were added in the new version */
  addedPaths: string[];
  /** Paths that were removed (breaking change) */
  removedPaths: string[];
  /** Paths that were modified */
  modifiedPaths: string[];
  /** Detected breaking changes */
  breakingChanges: BreakingChange[];
  /** Whether the comparison detected any breaking changes */
  hasBreakingChanges: boolean;
}

/**
 * Represents a breaking change between API versions.
 */
export interface BreakingChange {
  /** Type of breaking change */
  type: 'removed_path' | 'removed_parameter' | 'changed_type' | 'removed_response' | 'changed_constraint';
  /** Path or resource affected */
  path: string;
  /** Description of the breaking change */
  description: string;
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
}

/**
 * Options for loading OpenAPI schemas.
 */
export interface SchemaLoadOptions {
  /** Base directory containing OpenAPI schema files */
  schemaDir?: string;
  /** File naming pattern for schemas (e.g., 'openapi-{version}.json') */
  filePattern?: string;
}

/**
 * Extracts the API version from an Express request using multiple strategies:
 * 1. URL path segment (/api/v1/..., /api/v2/...)
 * 2. Accept header with vendor MIME type (application/vnd.intelgraph.v1+json)
 * 3. X-API-Version header
 * 4. Query parameter (?version=v1)
 *
 * @param req - Express request object
 * @returns Resolved API version (defaults to LATEST if not specified)
 *
 * @example
 * // URL-based versioning
 * GET /api/v1/users -> APIVersion.V1
 *
 * // Header-based versioning
 * Accept: application/vnd.intelgraph.v2+json -> APIVersion.V2
 *
 * // Custom header
 * X-API-Version: v3 -> APIVersion.V3
 *
 * // Query parameter
 * GET /api/users?version=v1 -> APIVersion.V1
 */
export function getAPIVersion(req: Request): APIVersion {
  // Strategy 1: Extract from URL path (/api/v1/..., /api/v2/...)
  const pathMatch = req.path.match(/^\/api\/(v\d+(?:\.\d+)?)\//);
  if (pathMatch) {
    const version = normalizeVersion(pathMatch[1]);
    if (isValidVersion(version)) {
      return version as APIVersion;
    }
  }

  // Strategy 2: Extract from Accept header (application/vnd.intelgraph.v1+json)
  const acceptHeader = req.headers.accept || '';
  const vendorMimeMatch = acceptHeader.match(
    new RegExp(`${VENDOR_MIME_PREFIX}(v\\d+(?:\\.\\d+)?)\\${VENDOR_MIME_SUFFIX}`)
  );
  if (vendorMimeMatch) {
    const version = normalizeVersion(vendorMimeMatch[1]);
    if (isValidVersion(version)) {
      return version as APIVersion;
    }
  }

  // Strategy 3: Extract from X-API-Version header
  const versionHeader = req.headers['x-api-version'] as string;
  if (versionHeader) {
    const version = normalizeVersion(versionHeader);
    if (isValidVersion(version)) {
      return version as APIVersion;
    }
  }

  // Strategy 4: Extract from query parameter (?version=v1)
  const queryVersion = req.query.version as string;
  if (queryVersion) {
    const version = normalizeVersion(queryVersion);
    if (isValidVersion(version)) {
      return version as APIVersion;
    }
  }

  // Default to latest version
  return APIVersion.LATEST;
}

/**
 * Normalizes version strings to standard format (e.g., 'v1', 'v2', 'v1.1').
 * Handles various input formats: 'v1', '1', 'V1', '1.0', etc.
 *
 * @param version - Version string to normalize
 * @returns Normalized version string
 */
function normalizeVersion(version: string): string {
  if (!version) return '';

  // Convert to lowercase and remove whitespace
  let normalized = version.toLowerCase().trim();

  // Add 'v' prefix if missing
  if (!normalized.startsWith('v')) {
    normalized = 'v' + normalized;
  }

  // Remove trailing '.0' (e.g., 'v1.0' -> 'v1')
  normalized = normalized.replace(/\.0$/, '');

  return normalized;
}

/**
 * Checks if a version string is a valid APIVersion enum value.
 *
 * @param version - Version string to validate
 * @returns True if valid, false otherwise
 */
function isValidVersion(version: string): boolean {
  return Object.values(APIVersion).includes(version as APIVersion);
}

/**
 * Creates an Express router that handles versioned routes.
 * Routes are automatically prefixed with the version (e.g., /api/v1/...).
 *
 * @param version - API version for this router
 * @returns Express Router configured for the specified version
 *
 * @example
 * const v1Router = versionRouter(APIVersion.V1);
 * v1Router.get('/users', getUsersV1);
 *
 * const v2Router = versionRouter(APIVersion.V2);
 * v2Router.get('/users', getUsersV2);
 *
 * app.use('/api/v1', v1Router);
 * app.use('/api/v2', v2Router);
 */
export function versionRouter(version: APIVersion): Router {
  const router = Router();

  // Add version metadata middleware
  router.use((req: Request, _res: Response, next: NextFunction) => {
    (req as VersionedRequest).apiVersion = version;
    (req as VersionedRequest).requestedVersion = version;
    next();
  });

  return router;
}

/**
 * Express middleware that adds deprecation headers to responses for deprecated API versions.
 * Follows RFC 8594 (Sunset HTTP Header) for deprecation notices.
 *
 * @param config - Deprecation configuration
 * @returns Express middleware function
 *
 * @example
 * // Deprecate v1 API with sunset date
 * app.use('/api/v1', deprecationMiddleware({
 *   version: APIVersion.V1,
 *   sunsetDate: new Date('2026-12-31'),
 *   message: 'API v1 is deprecated. Please migrate to v3.',
 *   migrationGuide: 'https://docs.intelgraph.tech/migration/v1-to-v3'
 * }));
 *
 * // Response headers:
 * // Deprecation: true
 * // Sunset: Fri, 31 Dec 2026 23:59:59 GMT
 * // Link: <https://docs.intelgraph.tech/migration/v1-to-v3>; rel="deprecation"
 */
export function deprecationMiddleware(config: DeprecationConfig) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Add Deprecation header (draft RFC)
    res.setHeader('Deprecation', 'true');

    // Add Sunset header (RFC 8594) - when the API will be removed
    if (config.sunsetDate) {
      res.setHeader('Sunset', config.sunsetDate.toUTCString());
    }

    // Add custom deprecation message in Warning header (RFC 7234)
    const message = config.message || `API ${config.version} is deprecated`;
    const warningDate = Math.floor(Date.now() / 1000);
    res.setHeader('Warning', `299 - "${message}" "${new Date(warningDate * 1000).toUTCString()}"`);

    // Add Link header to migration guide (RFC 8288)
    if (config.migrationGuide) {
      res.setHeader('Link', `<${config.migrationGuide}>; rel="deprecation"`);
    }

    // Add custom X-API-Deprecated header for easier client detection
    res.setHeader('X-API-Deprecated', config.version);
    res.setHeader('X-API-Sunset-Date', config.sunsetDate.toISOString());

    next();
  };
}

/**
 * Manages OpenAPI schema versions and computes differences between them.
 * Supports loading schemas from disk and detecting breaking changes.
 */
export class SchemaVersionManager {
  private schemas: Map<string, any> = new Map();
  private options: SchemaLoadOptions;

  /**
   * Creates a new SchemaVersionManager instance.
   *
   * @param options - Configuration options for schema loading
   */
  constructor(options: SchemaLoadOptions = {}) {
    this.options = {
      schemaDir: options.schemaDir || path.join(process.cwd(), 'schemas'),
      filePattern: options.filePattern || 'openapi-{version}.json',
    };
  }

  /**
   * Loads an OpenAPI schema from disk.
   *
   * @param version - API version to load schema for
   * @returns Parsed OpenAPI schema object
   * @throws Error if schema file cannot be read or parsed
   */
  async loadSchema(version: string): Promise<any> {
    // Check cache first
    if (this.schemas.has(version)) {
      return this.schemas.get(version);
    }

    // Construct file path
    const fileName = this.options.filePattern!.replace('{version}', version);
    const filePath = path.join(this.options.schemaDir!, fileName);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const schema = JSON.parse(fileContent);

      // Cache the schema
      this.schemas.set(version, schema);

      return schema;
    } catch (error: any) {
      throw new Error(
        `Failed to load OpenAPI schema for version ${version}: ${error.message}`
      );
    }
  }

  /**
   * Manually registers an OpenAPI schema (useful for testing or in-memory schemas).
   *
   * @param version - API version
   * @param schema - OpenAPI schema object
   */
  registerSchema(version: string, schema: any): void {
    this.schemas.set(version, schema);
  }

  /**
   * Computes the difference between two API versions.
   *
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Schema diff result with breaking change analysis
   *
   * @example
   * const manager = new SchemaVersionManager();
   * await manager.loadSchema('v1');
   * await manager.loadSchema('v2');
   *
   * const diff = await manager.computeDiff('v1', 'v2');
   * if (diff.hasBreakingChanges) {
   *   console.log('Breaking changes detected:', diff.breakingChanges);
   * }
   */
  async computeDiff(fromVersion: string, toVersion: string): Promise<SchemaVersionDiff> {
    const fromSchema = await this.loadSchema(fromVersion);
    const toSchema = await this.loadSchema(toVersion);

    const fromPaths = this.extractPaths(fromSchema);
    const toPaths = this.extractPaths(toSchema);

    // Compute added, removed, and modified paths
    const addedPaths = toPaths.filter((p) => !fromPaths.includes(p));
    const removedPaths = fromPaths.filter((p) => !toPaths.includes(p));
    const commonPaths = fromPaths.filter((p) => toPaths.includes(p));
    const modifiedPaths = this.findModifiedPaths(fromSchema, toSchema, commonPaths);

    // Analyze breaking changes
    const breakingChanges = this.detectBreakingChanges(
      fromSchema,
      toSchema,
      removedPaths,
      modifiedPaths
    );

    return {
      fromVersion,
      toVersion,
      addedPaths,
      removedPaths,
      modifiedPaths,
      breakingChanges,
      hasBreakingChanges: breakingChanges.length > 0,
    };
  }

  /**
   * Exports a diff report as a formatted string.
   *
   * @param diff - Schema version diff result
   * @param format - Output format ('text' or 'json')
   * @returns Formatted diff report
   */
  exportDiffReport(diff: SchemaVersionDiff, format: 'text' | 'json' = 'text'): string {
    if (format === 'json') {
      return JSON.stringify(diff, null, 2);
    }

    // Text format
    const lines: string[] = [];
    lines.push(`API Version Diff: ${diff.fromVersion} → ${diff.toVersion}`);
    lines.push('='.repeat(60));
    lines.push('');

    if (diff.addedPaths.length > 0) {
      lines.push('✅ Added Paths:');
      diff.addedPaths.forEach((p) => lines.push(`  + ${p}`));
      lines.push('');
    }

    if (diff.removedPaths.length > 0) {
      lines.push('❌ Removed Paths (Breaking):');
      diff.removedPaths.forEach((p) => lines.push(`  - ${p}`));
      lines.push('');
    }

    if (diff.modifiedPaths.length > 0) {
      lines.push('🔄 Modified Paths:');
      diff.modifiedPaths.forEach((p) => lines.push(`  ~ ${p}`));
      lines.push('');
    }

    if (diff.breakingChanges.length > 0) {
      lines.push('⚠️  Breaking Changes:');
      diff.breakingChanges.forEach((bc) => {
        lines.push(`  [${bc.severity.toUpperCase()}] ${bc.type}: ${bc.path}`);
        lines.push(`      ${bc.description}`);
      });
      lines.push('');
    }

    lines.push('Summary:');
    lines.push(`  Added: ${diff.addedPaths.length}`);
    lines.push(`  Removed: ${diff.removedPaths.length}`);
    lines.push(`  Modified: ${diff.modifiedPaths.length}`);
    lines.push(`  Breaking Changes: ${diff.breakingChanges.length}`);

    return lines.join('\n');
  }

  /**
   * Extracts all endpoint paths from an OpenAPI schema.
   *
   * @param schema - OpenAPI schema object
   * @returns Array of endpoint paths (e.g., ['/users', '/users/{id}'])
   */
  private extractPaths(schema: any): string[] {
    if (!schema?.paths) {
      return [];
    }

    return Object.keys(schema.paths);
  }

  /**
   * Finds paths that have been modified between two schemas.
   *
   * @param fromSchema - Source schema
   * @param toSchema - Target schema
   * @param commonPaths - Paths present in both schemas
   * @returns Array of modified path names
   */
  private findModifiedPaths(
    fromSchema: any,
    toSchema: any,
    commonPaths: string[]
  ): string[] {
    const modified: string[] = [];

    for (const pathName of commonPaths) {
      const fromPath = fromSchema.paths[pathName];
      const toPath = toSchema.paths[pathName];

      // Simple comparison - could be more sophisticated
      const fromJson = JSON.stringify(fromPath);
      const toJson = JSON.stringify(toPath);

      if (fromJson !== toJson) {
        modified.push(pathName);
      }
    }

    return modified;
  }

  /**
   * Detects breaking changes between two schemas.
   *
   * @param fromSchema - Source schema
   * @param toSchema - Target schema
   * @param removedPaths - Paths removed in target schema
   * @param modifiedPaths - Paths modified in target schema
   * @returns Array of detected breaking changes
   */
  private detectBreakingChanges(
    fromSchema: any,
    toSchema: any,
    removedPaths: string[],
    modifiedPaths: string[]
  ): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    // Removed paths are always breaking
    for (const path of removedPaths) {
      breakingChanges.push({
        type: 'removed_path',
        path,
        description: `Endpoint ${path} has been removed`,
        severity: 'high',
      });
    }

    // Check modified paths for breaking changes
    for (const pathName of modifiedPaths) {
      const fromPath = fromSchema.paths[pathName];
      const toPath = toSchema.paths[pathName];

      // Check each HTTP method
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      for (const method of methods) {
        if (fromPath[method] && !toPath[method]) {
          breakingChanges.push({
            type: 'removed_path',
            path: `${method.toUpperCase()} ${pathName}`,
            description: `HTTP method ${method.toUpperCase()} has been removed from ${pathName}`,
            severity: 'high',
          });
        }

        // Check for removed required parameters
        if (fromPath[method]?.parameters && toPath[method]?.parameters) {
          const fromParams = fromPath[method].parameters.filter((p: any) => p.required);
          const toParams = toPath[method].parameters.filter((p: any) => p.required);

          const removedParams = fromParams.filter(
            (fp: any) => !toParams.find((tp: any) => tp.name === fp.name)
          );

          for (const param of removedParams) {
            breakingChanges.push({
              type: 'removed_parameter',
              path: `${method.toUpperCase()} ${pathName}`,
              description: `Required parameter "${param.name}" has been removed`,
              severity: 'high',
            });
          }
        }
      }
    }

    return breakingChanges;
  }
}

/**
 * Helper function to create a version negotiation middleware that automatically
 * detects and sets the API version on the request object.
 *
 * @returns Express middleware function
 *
 * @example
 * app.use(versionNegotiationMiddleware());
 *
 * app.get('/api/users', (req: Request, res: Response) => {
 *   const version = (req as VersionedRequest).apiVersion;
 *   // Handle request based on version
 * });
 */
export function versionNegotiationMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const version = getAPIVersion(req);
    (req as VersionedRequest).apiVersion = version;
    next();
  };
}

/**
 * Validates that a requested API version is supported.
 * Sends 406 Not Acceptable if version is invalid.
 *
 * @param supportedVersions - Array of supported API versions
 * @returns Express middleware function
 *
 * @example
 * app.use(validateAPIVersion([APIVersion.V2, APIVersion.V3]));
 */
export function validateAPIVersion(supportedVersions: APIVersion[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedVersion = getAPIVersion(req);

    if (!supportedVersions.includes(requestedVersion)) {
      return res.status(406).json({
        error: 'API version not supported',
        requestedVersion,
        supportedVersions,
        message: `API version ${requestedVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
      });
    }

    next();
  };
}
