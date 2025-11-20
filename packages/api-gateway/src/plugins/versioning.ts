/**
 * API Versioning Plugin
 *
 * Supports multiple versioning strategies:
 * - URL path versioning (/v1/users, /v2/users)
 * - Header versioning (Accept-Version: v1)
 * - Query parameter versioning (?version=v1)
 */

import type { IncomingMessage } from 'http';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('versioning');

export enum VersioningStrategy {
  URL_PATH = 'URL_PATH',
  HEADER = 'HEADER',
  QUERY_PARAM = 'QUERY_PARAM',
  CONTENT_TYPE = 'CONTENT_TYPE',
}

export interface VersioningConfig {
  strategy: VersioningStrategy;
  headerName?: string;
  queryParamName?: string;
  defaultVersion?: string;
  supportedVersions: string[];
}

export class VersionManager {
  private config: VersioningConfig;

  constructor(config: VersioningConfig) {
    this.config = {
      headerName: 'Accept-Version',
      queryParamName: 'version',
      defaultVersion: 'v1',
      ...config,
    };
  }

  extractVersion(req: IncomingMessage): string | null {
    let version: string | null = null;

    switch (this.config.strategy) {
      case VersioningStrategy.URL_PATH:
        version = this.extractFromUrlPath(req.url || '');
        break;
      case VersioningStrategy.HEADER:
        version = this.extractFromHeader(req);
        break;
      case VersioningStrategy.QUERY_PARAM:
        version = this.extractFromQueryParam(req.url || '');
        break;
      case VersioningStrategy.CONTENT_TYPE:
        version = this.extractFromContentType(req);
        break;
    }

    // Validate version
    if (version && !this.isVersionSupported(version)) {
      logger.warn('Unsupported API version requested', {
        version,
        supported: this.config.supportedVersions,
      });
      return null;
    }

    return version || this.config.defaultVersion || null;
  }

  private extractFromUrlPath(url: string): string | null {
    const match = url.match(/\/(v\d+)\//);
    return match ? match[1] : null;
  }

  private extractFromHeader(req: IncomingMessage): string | null {
    return req.headers[this.config.headerName!.toLowerCase()] as string || null;
  }

  private extractFromQueryParam(url: string): string | null {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get(this.config.queryParamName!) || null;
  }

  private extractFromContentType(req: IncomingMessage): string | null {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/version=(v\d+)/);
    return match ? match[1] : null;
  }

  isVersionSupported(version: string): boolean {
    return this.config.supportedVersions.includes(version);
  }

  rewriteUrl(url: string, version: string): string {
    // Rewrite URL to include version if not already present
    if (this.config.strategy === VersioningStrategy.URL_PATH) {
      if (!url.match(/\/v\d+\//)) {
        const parts = url.split('/');
        parts.splice(1, 0, version);
        return parts.join('/');
      }
    }
    return url;
  }

  getSupportedVersions(): string[] {
    return [...this.config.supportedVersions];
  }

  getDefaultVersion(): string {
    return this.config.defaultVersion || 'v1';
  }
}
