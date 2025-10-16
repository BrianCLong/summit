import { Request, Response, NextFunction } from 'express';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import jwt from 'jsonwebtoken';
import { pg } from '../../server/src/db/pg';

const tracer = trace.getTracer('region-router', '24.3.0');

// Region routing metrics
const regionRoutingRequests = new Counter({
  name: 'region_routing_requests_total',
  help: 'Total region routing requests',
  labelNames: ['source_region', 'target_region', 'tenant_id', 'status'],
});

const regionRoutingLatency = new Histogram({
  name: 'region_routing_latency_seconds',
  help: 'Region routing lookup latency',
  labelNames: ['source_region', 'target_region'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

const crossRegionBlocks = new Counter({
  name: 'cross_region_blocks_total',
  help: 'Cross-region access attempts blocked',
  labelNames: ['source_region', 'target_region', 'tenant_id', 'block_reason'],
});

const regionHealth = new Gauge({
  name: 'region_health_status',
  help: 'Health status of each region (1=healthy, 0=unhealthy)',
  labelNames: ['region', 'service'],
});

interface TenantRegionInfo {
  tenantId: string;
  regionTag: string;
  residency: {
    region: string;
    class: 'standard' | 'restricted' | 'sovereign';
    dataClassification?: string[];
  };
  isActive: boolean;
}

interface RegionConfig {
  region: string;
  endpoints: {
    api: string;
    graphql: string;
  };
  isPrimary: boolean;
  isHealthy: boolean;
  services: string[];
}

class RegionRouter {
  private currentRegion: string;
  private regionConfigs: Map<string, RegionConfig> = new Map();
  private tenantCache: Map<string, TenantRegionInfo> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(currentRegion: string) {
    this.currentRegion = currentRegion;
    this.initializeRegionConfigs();
    this.startHealthMonitoring();
  }

  private initializeRegionConfigs(): void {
    const regions: RegionConfig[] = [
      {
        region: 'us-east-1',
        endpoints: {
          api: process.env.US_EAST_API_URL || 'https://api-us-east.maestro.dev',
          graphql:
            process.env.US_EAST_GRAPHQL_URL ||
            'https://api-us-east.maestro.dev/graphql',
        },
        isPrimary: true,
        isHealthy: true,
        services: ['api', 'graphql', 'ingest'],
      },
      {
        region: 'us-west-2',
        endpoints: {
          api: process.env.US_WEST_API_URL || 'https://api-us-west.maestro.dev',
          graphql:
            process.env.US_WEST_GRAPHQL_URL ||
            'https://api-us-west.maestro.dev/graphql',
        },
        isPrimary: false,
        isHealthy: true,
        services: ['api', 'graphql'], // Read-only replica
      },
      {
        region: 'eu-west-1',
        endpoints: {
          api: process.env.EU_WEST_API_URL || 'https://api-eu-west.maestro.dev',
          graphql:
            process.env.EU_WEST_GRAPHQL_URL ||
            'https://api-eu-west.maestro.dev/graphql',
        },
        isPrimary: false,
        isHealthy: true,
        services: ['api', 'graphql'], // Read-only replica
      },
    ];

    regions.forEach((config) => {
      this.regionConfigs.set(config.region, config);
    });
  }

  private startHealthMonitoring(): void {
    // Monitor region health every 30 seconds
    setInterval(async () => {
      for (const [region, config] of this.regionConfigs) {
        try {
          const healthUrl = `${config.endpoints.api}/health`;
          const response = await fetch(healthUrl, {
            method: 'GET',
            timeout: 5000,
          });

          const isHealthy = response.ok;
          config.isHealthy = isHealthy;

          regionHealth.set({ region, service: 'api' }, isHealthy ? 1 : 0);
        } catch (error) {
          config.isHealthy = false;
          regionHealth.set({ region, service: 'api' }, 0);
          console.error(`Region ${region} health check failed:`, error);
        }
      }
    }, 30000);
  }

  async getTenantRegionInfo(
    tenantId: string,
  ): Promise<TenantRegionInfo | null> {
    return tracer.startActiveSpan(
      'region_router.get_tenant_region',
      async (span: Span) => {
        const startTime = Date.now();

        try {
          // Check cache first
          const cached = this.tenantCache.get(tenantId);
          if (
            cached &&
            Date.now() - (cached as any).cachedAt < this.cacheExpiry
          ) {
            span.setAttributes({
              tenant_id: tenantId,
              region: cached.regionTag,
              cache_hit: true,
            });
            return cached;
          }

          // Query database for tenant region information
          const tenantData = await pg.oneOrNone(
            `SELECT 
             tenant_id,
             region_tag,
             residency_region,
             residency_class,
             residency_data_classification,
             is_active,
             updated_at
           FROM tenants 
           WHERE tenant_id = $1 AND is_active = true`,
            [tenantId],
            { tenantId }, // Use tenant scoping
          );

          if (!tenantData) {
            span.setAttributes({
              tenant_id: tenantId,
              found: false,
            });
            return null;
          }

          const tenantRegionInfo: TenantRegionInfo = {
            tenantId: tenantData.tenant_id,
            regionTag: tenantData.region_tag || this.getPrimaryRegion(),
            residency: {
              region:
                tenantData.residency_region ||
                tenantData.region_tag ||
                this.getPrimaryRegion(),
              class: tenantData.residency_class || 'standard',
              dataClassification:
                tenantData.residency_data_classification || [],
            },
            isActive: tenantData.is_active,
          };

          // Cache the result
          (tenantRegionInfo as any).cachedAt = Date.now();
          this.tenantCache.set(tenantId, tenantRegionInfo);

          span.setAttributes({
            tenant_id: tenantId,
            region: tenantRegionInfo.regionTag,
            residency_class: tenantRegionInfo.residency.class,
            cache_hit: false,
          });

          return tenantRegionInfo;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          const duration = (Date.now() - startTime) / 1000;
          regionRoutingLatency.observe(
            { source_region: this.currentRegion, target_region: 'lookup' },
            duration,
          );
          span.end();
        }
      },
    );
  }

  private getPrimaryRegion(): string {
    for (const [region, config] of this.regionConfigs) {
      if (config.isPrimary) {
        return region;
      }
    }
    return 'us-east-1'; // Fallback
  }

  private extractTenantFromToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token) as any;
      return decoded?.tenantId || decoded?.sub || null;
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  }

  private isWriteOperation(req: Request): boolean {
    // Determine if this is a write operation
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Check GraphQL mutations
    if (req.path.includes('/graphql') && req.body?.query) {
      const query = req.body.query.toLowerCase();
      return query.includes('mutation') || query.includes('subscription');
    }

    // Check ingest endpoints
    if (req.path.includes('/ingest/')) {
      return true;
    }

    return false;
  }

  private hasExportToken(req: Request): boolean {
    // Check for valid export token that allows cross-region access
    const exportToken = req.headers['x-export-token'] as string;
    if (!exportToken) {
      return false;
    }

    try {
      // Verify export token signature and permissions
      const decoded = jwt.verify(
        exportToken,
        process.env.EXPORT_TOKEN_SECRET!,
      ) as any;
      return (
        decoded.purpose === 'cross-region-export' &&
        decoded.exp > Date.now() / 1000
      );
    } catch (error) {
      return false;
    }
  }

  async routeRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'region_router.route_request',
      async (span: Span) => {
        const tenantId =
          this.extractTenantFromToken(req) ||
          (req.headers['x-tenant-id'] as string);

        span.setAttributes({
          'http.method': req.method,
          'http.url': req.url,
          tenant_id: tenantId || 'anonymous',
          source_region: this.currentRegion,
        });

        // Skip routing for health checks and internal endpoints
        if (
          req.path === '/health' ||
          req.path === '/metrics' ||
          req.path.startsWith('/.well-known/')
        ) {
          return next();
        }

        if (!tenantId) {
          span.setAttributes({ routing_decision: 'no_tenant_continue' });
          return next();
        }

        try {
          const tenantInfo = await this.getTenantRegionInfo(tenantId);
          if (!tenantInfo) {
            span.setAttributes({ routing_decision: 'tenant_not_found' });
            res.status(404).json({
              error: 'Tenant not found or inactive',
              code: 'TENANT_NOT_FOUND',
            });
            return;
          }

          const targetRegion = tenantInfo.regionTag;
          const isWrite = this.isWriteOperation(req);
          const hasExportAuth = this.hasExportToken(req);

          span.setAttributes({
            target_region: targetRegion,
            is_write: isWrite,
            has_export_token: hasExportAuth,
            residency_class: tenantInfo.residency.class,
          });

          // Check if request should be handled in current region
          if (targetRegion === this.currentRegion) {
            // Same region - continue to local handler
            req.headers['x-ig-region'] = this.currentRegion;
            req.headers['x-tenant-region'] = targetRegion;
            req.headers['x-residency-class'] = tenantInfo.residency.class;

            regionRoutingRequests.inc({
              source_region: this.currentRegion,
              target_region: targetRegion,
              tenant_id: tenantId,
              status: 'local',
            });

            span.setAttributes({ routing_decision: 'local' });
            return next();
          }

          // Cross-region request handling
          const targetConfig = this.regionConfigs.get(targetRegion);
          if (!targetConfig || !targetConfig.isHealthy) {
            // Target region unavailable - check if we can serve read requests locally
            if (
              !isWrite &&
              this.regionConfigs.get(this.currentRegion)?.isHealthy
            ) {
              console.warn(
                `Target region ${targetRegion} unavailable, serving read request locally`,
              );
              req.headers['x-ig-region'] = this.currentRegion;
              req.headers['x-tenant-region'] = targetRegion;
              req.headers['x-cross-region-fallback'] = 'true';

              regionRoutingRequests.inc({
                source_region: this.currentRegion,
                target_region: targetRegion,
                tenant_id: tenantId,
                status: 'fallback',
              });

              span.setAttributes({ routing_decision: 'fallback_local' });
              return next();
            } else {
              span.setAttributes({ routing_decision: 'target_unavailable' });
              res.status(503).json({
                error: `Target region ${targetRegion} is unavailable`,
                code: 'REGION_UNAVAILABLE',
                targetRegion,
              });
              return;
            }
          }

          // Check authorization for cross-region access
          if (!hasExportAuth) {
            // Block unauthorized cross-region access
            crossRegionBlocks.inc({
              source_region: this.currentRegion,
              target_region: targetRegion,
              tenant_id: tenantId,
              block_reason: 'no_export_token',
            });

            span.setAttributes({ routing_decision: 'blocked_no_token' });
            res.status(403).json({
              error: 'Cross-region access requires export authorization',
              code: 'CROSS_REGION_FORBIDDEN',
              targetRegion,
              canonicalUrl: this.getCanonicalUrl(targetConfig, req),
            });
            return;
          }

          // Redirect to correct region with 302
          const redirectUrl = this.getCanonicalUrl(targetConfig, req);

          regionRoutingRequests.inc({
            source_region: this.currentRegion,
            target_region: targetRegion,
            tenant_id: tenantId,
            status: 'redirect',
          });

          span.setAttributes({
            routing_decision: 'redirect',
            redirect_url: redirectUrl,
          });

          res.status(302).json({
            message: 'Request should be handled in correct region',
            code: 'REGION_REDIRECT',
            targetRegion,
            redirectUrl,
          });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });

          console.error('Region routing error:', error);
          res.status(500).json({
            error: 'Internal region routing error',
            code: 'ROUTING_ERROR',
          });
        } finally {
          span.end();
        }
      },
    );
  }

  private getCanonicalUrl(regionConfig: RegionConfig, req: Request): string {
    const baseUrl = req.path.includes('/graphql')
      ? regionConfig.endpoints.graphql
      : regionConfig.endpoints.api;

    return `${baseUrl}${req.path}${req.search || ''}`;
  }

  // Health endpoint for this router
  getHealthStatus(): object {
    const healthyRegions = Array.from(this.regionConfigs.values())
      .filter((config) => config.isHealthy)
      .map((config) => config.region);

    return {
      currentRegion: this.currentRegion,
      totalRegions: this.regionConfigs.size,
      healthyRegions: healthyRegions.length,
      regions: Object.fromEntries(
        Array.from(this.regionConfigs.entries()).map(([region, config]) => [
          region,
          {
            healthy: config.isHealthy,
            isPrimary: config.isPrimary,
            services: config.services,
          },
        ]),
      ),
      tenantCacheSize: this.tenantCache.size,
    };
  }
}

// Export the router instance
export const regionRouter = new RegionRouter(
  process.env.CURRENT_REGION || 'us-east-1',
);

// Middleware function
export const regionRoutingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  regionRouter.routeRequest(req, res, next);
};
