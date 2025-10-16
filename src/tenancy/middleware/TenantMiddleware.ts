/**
 * @fileoverview Multi-tenant Request Middleware
 * Handles tenant context extraction, validation, and isolation enforcement
 * for all incoming requests with comprehensive security boundaries.
 */

import { Request, Response, NextFunction } from 'express';
import { TenantManager, TenantContext } from '../core/TenantManager.js';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Extended request interface with tenant context
 */
export interface TenantRequest extends Request {
  tenant?: TenantContext;
  tenantId?: string;
  isolationContext?: IsolationContext;
}

/**
 * Isolation context for enforcing boundaries
 */
export interface IsolationContext {
  tenantId: string;
  isolationLevel: 'strict' | 'standard' | 'relaxed';
  allowedResources: string[];
  restrictedOperations: string[];
  auditRequired: boolean;
  encryptionRequired: boolean;
}

/**
 * Tenant resolution strategies
 */
export type TenantResolutionStrategy =
  | 'subdomain'
  | 'header'
  | 'path'
  | 'custom';

/**
 * Configuration for tenant middleware
 */
export interface TenantMiddlewareConfig {
  strategy: TenantResolutionStrategy;
  headerName?: string;
  pathPrefix?: string;
  customResolver?: (req: Request) => Promise<string | null>;
  enforceIsolation: boolean;
  auditRequests: boolean;
  cacheTimeout: number;
  failureMode: 'block' | 'allow' | 'redirect';
  redirectUrl?: string;
}

/**
 * Tenant context cache for performance
 */
class TenantContextCache {
  private cache = new Map<
    string,
    { context: TenantContext; expires: number }
  >();
  private readonly ttl: number;

  constructor(ttlMs: number = 300000) {
    // 5 minutes default
    this.ttl = ttlMs;
    this.startCleanup();
  }

  get(key: string): TenantContext | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.context;
  }

  set(key: string, context: TenantContext): void {
    this.cache.set(key, {
      context,
      expires: Date.now() + this.ttl,
    });
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }
}

/**
 * Multi-tenant middleware with comprehensive isolation and security
 */
export class TenantMiddleware {
  private tenantManager: TenantManager;
  private contextCache: TenantContextCache;
  private auditLog: Array<{
    timestamp: Date;
    tenantId: string;
    userId?: string;
    action: string;
    resource: string;
    success: boolean;
    duration: number;
    metadata: Record<string, any>;
  }> = [];

  constructor(
    tenantManager: TenantManager,
    private config: TenantMiddlewareConfig,
  ) {
    this.tenantManager = tenantManager;
    this.contextCache = new TenantContextCache(config.cacheTimeout);
  }

  /**
   * Main middleware function for tenant context injection
   */
  middleware = async (
    req: TenantRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const startTime = performance.now();

    try {
      // Extract tenant identifier from request
      const tenantIdentifier = await this.extractTenantIdentifier(req);

      if (!tenantIdentifier) {
        return this.handleMissingTenant(req, res, next);
      }

      // Resolve tenant configuration
      const tenant = await this.resolveTenant(tenantIdentifier);

      if (!tenant) {
        return this.handleInvalidTenant(req, res, next, tenantIdentifier);
      }

      // Create tenant context
      const context = await this.createRequestContext(req, tenant.tenantId);

      // Set up isolation context
      const isolationContext = await this.createIsolationContext(
        tenant.tenantId,
        req,
      );

      // Attach to request
      req.tenant = context;
      req.tenantId = tenant.tenantId;
      req.isolationContext = isolationContext;

      // Validate resource access
      if (this.config.enforceIsolation) {
        const accessGranted = await this.validateResourceAccess(req);
        if (!accessGranted) {
          return this.handleAccessDenied(req, res, next);
        }
      }

      // Audit request if required
      if (this.config.auditRequests) {
        await this.auditRequest(req, true, performance.now() - startTime);
      }

      // Continue to next middleware
      next();
    } catch (error) {
      await this.auditRequest(req, false, performance.now() - startTime, error);
      this.handleError(req, res, next, error);
    }
  };

  /**
   * Extract tenant identifier based on configured strategy
   */
  private async extractTenantIdentifier(
    req: TenantRequest,
  ): Promise<string | null> {
    switch (this.config.strategy) {
      case 'subdomain':
        return this.extractFromSubdomain(req);

      case 'header':
        return this.extractFromHeader(req);

      case 'path':
        return this.extractFromPath(req);

      case 'custom':
        return this.config.customResolver
          ? await this.config.customResolver(req)
          : null;

      default:
        throw new Error(
          `Unknown tenant resolution strategy: ${this.config.strategy}`,
        );
    }
  }

  /**
   * Extract tenant from subdomain (most common for SaaS)
   */
  private extractFromSubdomain(req: TenantRequest): string | null {
    const host = req.get('host');
    if (!host) return null;

    const parts = host.split('.');
    if (parts.length < 2) return null;

    const subdomain = parts[0];

    // Filter out common non-tenant subdomains
    const systemSubdomains = ['www', 'api', 'admin', 'app', 'dashboard'];
    if (systemSubdomains.includes(subdomain.toLowerCase())) {
      return null;
    }

    return subdomain;
  }

  /**
   * Extract tenant from custom header
   */
  private extractFromHeader(req: TenantRequest): string | null {
    if (!this.config.headerName) {
      throw new Error(
        'Header name not configured for header-based tenant resolution',
      );
    }

    return req.get(this.config.headerName) || null;
  }

  /**
   * Extract tenant from URL path
   */
  private extractFromPath(req: TenantRequest): string | null {
    if (!this.config.pathPrefix) {
      throw new Error(
        'Path prefix not configured for path-based tenant resolution',
      );
    }

    const pathMatch = req.path.match(
      new RegExp(`^/${this.config.pathPrefix}/([^/]+)`),
    );
    return pathMatch ? pathMatch[1] : null;
  }

  /**
   * Resolve tenant configuration with caching
   */
  private async resolveTenant(identifier: string) {
    const cacheKey = `tenant:${identifier}`;

    // Try cache first
    let cachedContext = this.contextCache.get(cacheKey);
    if (cachedContext) {
      return await this.tenantManager.getTenant(cachedContext.tenantId);
    }

    // Resolve tenant by domain/identifier
    const tenant = await this.tenantManager.getTenantByDomain(identifier);

    if (tenant) {
      // Cache the resolved context
      const context = this.tenantManager.createTenantContext(tenant.tenantId);
      this.contextCache.set(cacheKey, context);
    }

    return tenant;
  }

  /**
   * Create request-specific tenant context
   */
  private async createRequestContext(
    req: TenantRequest,
    tenantId: string,
  ): Promise<TenantContext> {
    const userId = this.extractUserId(req);
    const sessionId = this.extractSessionId(req);
    const permissions = await this.extractUserPermissions(
      req,
      tenantId,
      userId,
    );

    return this.tenantManager.createTenantContext(tenantId, userId, {
      sessionId,
      permissions,
      metadata: {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        timestamp: new Date(),
        requestId: this.generateRequestId(req),
      },
    });
  }

  /**
   * Create isolation context for request
   */
  private async createIsolationContext(
    tenantId: string,
    req: TenantRequest,
  ): Promise<IsolationContext> {
    const tenant = await this.tenantManager.getTenant(tenantId);

    return {
      tenantId,
      isolationLevel:
        tenant?.security.auditLevel === 'comprehensive' ? 'strict' : 'standard',
      allowedResources: await this.getAllowedResources(tenantId, req),
      restrictedOperations: await this.getRestrictedOperations(tenantId, req),
      auditRequired: tenant?.features.auditLogging || false,
      encryptionRequired: tenant?.security.encryptionAtRest || false,
    };
  }

  /**
   * Validate resource access based on tenant isolation
   */
  private async validateResourceAccess(req: TenantRequest): Promise<boolean> {
    const { isolationContext } = req;
    if (!isolationContext) return false;

    // Check if accessing allowed resources
    const requestedResource = this.extractRequestedResource(req);
    if (requestedResource && isolationContext.allowedResources.length > 0) {
      const hasAccess = isolationContext.allowedResources.some((resource) =>
        requestedResource.startsWith(resource),
      );
      if (!hasAccess) return false;
    }

    // Check for restricted operations
    const operation = req.method.toLowerCase();
    if (isolationContext.restrictedOperations.includes(operation)) {
      return false;
    }

    // Additional IP-based restrictions
    const tenant = await this.tenantManager.getTenant(
      isolationContext.tenantId,
    );
    if (tenant?.security.ipWhitelist.length > 0) {
      const clientIp = req.ip;
      if (!tenant.security.ipWhitelist.includes(clientIp)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract user ID from request (JWT, session, etc.)
   */
  private extractUserId(req: TenantRequest): string | undefined {
    // Implementation would extract from JWT token, session, etc.
    return req.get('x-user-id') || undefined;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: TenantRequest): string {
    return (
      req.get('x-session-id') ||
      req.sessionID ||
      createHash('md5').update(`${req.ip}-${Date.now()}`).digest('hex')
    );
  }

  /**
   * Extract user permissions for tenant context
   */
  private async extractUserPermissions(
    req: TenantRequest,
    tenantId: string,
    userId?: string,
  ): Promise<string[]> {
    // Implementation would query user permissions from database
    // For now, return mock permissions
    return ['read', 'write'];
  }

  /**
   * Get allowed resources for tenant
   */
  private async getAllowedResources(
    tenantId: string,
    req: TenantRequest,
  ): Promise<string[]> {
    // Implementation would return tenant-specific resource access list
    return [`/api/tenant/${tenantId}`];
  }

  /**
   * Get restricted operations for tenant
   */
  private async getRestrictedOperations(
    tenantId: string,
    req: TenantRequest,
  ): Promise<string[]> {
    const tenant = await this.tenantManager.getTenant(tenantId);
    const restrictions: string[] = [];

    // Restrict based on tenant status
    if (tenant?.status === 'trial') {
      restrictions.push('delete');
    }

    if (tenant?.status === 'suspended') {
      restrictions.push('post', 'put', 'patch', 'delete');
    }

    return restrictions;
  }

  /**
   * Extract requested resource from URL
   */
  private extractRequestedResource(req: TenantRequest): string {
    return req.path;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(req: TenantRequest): string {
    return createHash('md5')
      .update(
        `${req.ip}-${req.get('user-agent')}-${Date.now()}-${Math.random()}`,
      )
      .digest('hex');
  }

  /**
   * Handle missing tenant scenarios
   */
  private handleMissingTenant(
    req: TenantRequest,
    res: Response,
    next: NextFunction,
  ): void {
    switch (this.config.failureMode) {
      case 'block':
        res.status(400).json({
          error: 'Missing tenant identifier',
          code: 'TENANT_REQUIRED',
        });
        break;

      case 'redirect':
        if (this.config.redirectUrl) {
          res.redirect(this.config.redirectUrl);
        } else {
          next();
        }
        break;

      case 'allow':
      default:
        next();
        break;
    }
  }

  /**
   * Handle invalid tenant scenarios
   */
  private handleInvalidTenant(
    req: TenantRequest,
    res: Response,
    next: NextFunction,
    identifier: string,
  ): void {
    res.status(404).json({
      error: 'Tenant not found',
      code: 'TENANT_NOT_FOUND',
      identifier,
    });
  }

  /**
   * Handle access denied scenarios
   */
  private handleAccessDenied(
    req: TenantRequest,
    res: Response,
    next: NextFunction,
  ): void {
    res.status(403).json({
      error: 'Access denied',
      code: 'TENANT_ACCESS_DENIED',
      resource: req.path,
    });
  }

  /**
   * Handle middleware errors
   */
  private handleError(
    req: TenantRequest,
    res: Response,
    next: NextFunction,
    error: any,
  ): void {
    console.error('Tenant middleware error:', error);

    res.status(500).json({
      error: 'Internal server error',
      code: 'TENANT_MIDDLEWARE_ERROR',
    });
  }

  /**
   * Audit request for compliance and monitoring
   */
  private async auditRequest(
    req: TenantRequest,
    success: boolean,
    duration: number,
    error?: any,
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      tenantId: req.tenantId || 'unknown',
      userId: req.tenant?.userId,
      action: req.method,
      resource: req.path,
      success,
      duration,
      metadata: {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        sessionId: req.tenant?.sessionId,
        error: error?.message,
      },
    };

    this.auditLog.push(auditEntry);

    // Maintain audit log size (keep last 10000 entries)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    // In production, would send to audit service/database
    if (!success) {
      console.warn('Tenant access audit failure:', auditEntry);
    }
  }

  /**
   * Get audit log entries (for monitoring/compliance)
   */
  getAuditLog(tenantId?: string, limit: number = 100): typeof this.auditLog {
    let filtered = this.auditLog;

    if (tenantId) {
      filtered = filtered.filter((entry) => entry.tenantId === tenantId);
    }

    return filtered.slice(-limit);
  }

  /**
   * Clear audit log (for testing/maintenance)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

/**
 * Factory function to create tenant middleware with common configurations
 */
export function createTenantMiddleware(
  tenantManager: TenantManager,
  strategy: TenantResolutionStrategy = 'subdomain',
  options: Partial<TenantMiddlewareConfig> = {},
): TenantMiddleware {
  const config: TenantMiddlewareConfig = {
    strategy,
    enforceIsolation: true,
    auditRequests: true,
    cacheTimeout: 300000, // 5 minutes
    failureMode: 'block',
    ...options,
  };

  return new TenantMiddleware(tenantManager, config);
}

/**
 * Tenant-aware database query wrapper
 */
export function withTenantIsolation<T>(
  query: (context: TenantContext) => Promise<T>,
) {
  return async (req: TenantRequest): Promise<T> => {
    if (!req.tenant) {
      throw new Error(
        'Tenant context not found - ensure tenant middleware is configured',
      );
    }

    return query(req.tenant);
  };
}
