/**
 * API Versioning Middleware
 *
 * Handles API version extraction and routing
 */

import type { Request, Response, NextFunction, VersioningOptions, VersionInfo } from '../types';

export function versioningMiddleware(options: VersioningOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    let version = options.defaultVersion || '1.0';

    switch (options.strategy) {
      case 'url':
        // Extract version from URL path (e.g., /v1/resource)
        const match = req.path.match(/^\/v(\d+(?:\.\d+)?)\//);
        if (match) {
          version = match[1];
        }
        break;

      case 'header':
        // Extract version from custom header
        const headerName = options.headerName || 'api-version';
        const headerVersion = req.get(headerName);
        if (headerVersion) {
          version = headerVersion;
        }
        break;

      case 'query':
        // Extract version from query parameter
        const queryName = options.queryName || 'version';
        const queryVersion = req.query[queryName] as string;
        if (queryVersion) {
          version = queryVersion;
        }
        break;

      case 'accept':
        // Extract version from Accept header (e.g., application/vnd.api.v1+json)
        const acceptHeader = req.get('accept');
        if (acceptHeader) {
          const prefix = options.acceptPrefix || 'application/vnd.api.v';
          const acceptMatch = acceptHeader.match(
            new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+(?:\\.\\d+)?)`)
          );
          if (acceptMatch) {
            version = acceptMatch[1];
          }
        }
        break;
    }

    // Store version in context
    if (req.context) {
      req.context.apiVersion = version;
    }

    // Add version to response headers
    res.setHeader('API-Version', version);

    // Add deprecation warnings if enabled
    if (options.deprecationWarnings) {
      // This would check against a registry of deprecated versions
      // For now, just a placeholder
    }

    next();
  };
}

/**
 * Version info registry
 */
export class VersionRegistry {
  private versions: Map<string, VersionInfo> = new Map();

  register(version: string, info: Partial<VersionInfo> = {}) {
    this.versions.set(version, {
      version,
      deprecated: info.deprecated || false,
      sunset: info.sunset,
      alternativeVersion: info.alternativeVersion,
    });
  }

  get(version: string): VersionInfo | undefined {
    return this.versions.get(version);
  }

  isDeprecated(version: string): boolean {
    const info = this.versions.get(version);
    return info?.deprecated || false;
  }

  getSunsetDate(version: string): Date | undefined {
    const info = this.versions.get(version);
    return info?.sunset;
  }

  getAlternativeVersion(version: string): string | undefined {
    const info = this.versions.get(version);
    return info?.alternativeVersion;
  }
}
