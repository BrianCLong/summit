/**
 * Documentation as a Service Platform with API Access
 * Enterprise Multi-Tenant Documentation Platform
 * Phase 50: Complete Documentation Platform Service
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface PlatformConfig {
  api: APIConfig;
  multiTenant: MultiTenantConfig;
  billing: BillingConfig;
  marketplace: MarketplaceConfig;
  integration: IntegrationConfig;
  scaling: ScalingConfig;
  governance: GovernanceConfig;
  analytics: PlatformAnalyticsConfig;
}

export interface APIConfig {
  version: string;
  baseUrl: string;
  authentication: AuthenticationConfig;
  rateLimit: RateLimitConfig;
  versioning: VersioningConfig;
  documentation: APIDocumentationConfig;
  sdk: SDKConfig;
}

export interface MultiTenantConfig {
  isolation: IsolationConfig;
  customization: CustomizationConfig;
  resources: ResourceConfig;
  billing: TenantBillingConfig;
  onboarding: OnboardingConfig;
}

export interface Tenant {
  id: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  configuration: TenantConfiguration;
  usage: TenantUsage;
  billing: TenantBilling;
  metadata: TenantMetadata;
}

export interface APIEndpoint {
  path: string;
  method: string;
  handler: string;
  authentication: boolean;
  rateLimit?: RateLimitConfig;
  documentation: EndpointDocumentation;
  version: string;
  deprecated?: boolean;
}

export interface PlatformService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  version: string;
  endpoints: APIEndpoint[];
  dependencies: ServiceDependency[];
  configuration: ServiceConfiguration;
  health: ServiceHealth;
}

export class DocumentationServicePlatform extends EventEmitter {
  private config: PlatformConfig;
  private tenants: Map<string, Tenant> = new Map();
  private services: Map<string, PlatformService> = new Map();
  private apiGateway: APIGateway;
  private billingEngine: BillingEngine;
  private marketplaceManager: MarketplaceManager;
  private analyticsEngine: PlatformAnalyticsEngine;
  private fastify: FastifyInstance;

  constructor(config: PlatformConfig, fastify: FastifyInstance) {
    super();
    this.config = config;
    this.fastify = fastify;
    this.apiGateway = new APIGateway(config.api);
    this.billingEngine = new BillingEngine(config.billing);
    this.marketplaceManager = new MarketplaceManager(config.marketplace);
    this.analyticsEngine = new PlatformAnalyticsEngine(config.analytics);
    this.initializePlatform();
  }

  /**
   * Initialize the documentation service platform
   */
  private async initializePlatform(): Promise<void> {
    await this.setupAPIRoutes();
    await this.initializeMultiTenancy();
    await this.setupBilling();
    await this.initializeMarketplace();
    await this.setupAnalytics();
    await this.enableGovernance();
    await this.setupScaling();
    this.emit('platform:initialized');
  }

  /**
   * Setup comprehensive API routes
   */
  private async setupAPIRoutes(): Promise<void> {
    // Authentication routes
    this.fastify.register(this.authenticationRoutes.bind(this), {
      prefix: '/api/v1/auth',
    });

    // Tenant management routes
    this.fastify.register(this.tenantRoutes.bind(this), {
      prefix: '/api/v1/tenants',
    });

    // Documentation service routes
    this.fastify.register(this.documentationRoutes.bind(this), {
      prefix: '/api/v1/docs',
    });

    // Content management routes
    this.fastify.register(this.contentRoutes.bind(this), {
      prefix: '/api/v1/content',
    });

    // Analytics routes
    this.fastify.register(this.analyticsRoutes.bind(this), {
      prefix: '/api/v1/analytics',
    });

    // Billing routes
    this.fastify.register(this.billingRoutes.bind(this), {
      prefix: '/api/v1/billing',
    });

    // Marketplace routes
    this.fastify.register(this.marketplaceRoutes.bind(this), {
      prefix: '/api/v1/marketplace',
    });

    // Integration routes
    this.fastify.register(this.integrationRoutes.bind(this), {
      prefix: '/api/v1/integrations',
    });

    // Platform administration routes
    this.fastify.register(this.adminRoutes.bind(this), {
      prefix: '/api/v1/admin',
    });

    this.emit('routes:registered');
  }

  /**
   * Authentication routes
   */
  private async authenticationRoutes(fastify: FastifyInstance): Promise<void> {
    // Login
    fastify.post('/login', this.handleLogin.bind(this));

    // Register
    fastify.post('/register', this.handleRegister.bind(this));

    // Refresh token
    fastify.post('/refresh', this.handleTokenRefresh.bind(this));

    // Logout
    fastify.post('/logout', this.handleLogout.bind(this));

    // OAuth endpoints
    fastify.get('/oauth/:provider', this.handleOAuthLogin.bind(this));
    fastify.get(
      '/oauth/:provider/callback',
      this.handleOAuthCallback.bind(this),
    );

    // API key management
    fastify.get('/api-keys', this.getAPIKeys.bind(this));
    fastify.post('/api-keys', this.createAPIKey.bind(this));
    fastify.delete('/api-keys/:keyId', this.revokeAPIKey.bind(this));
  }

  /**
   * Tenant management routes
   */
  private async tenantRoutes(fastify: FastifyInstance): Promise<void> {
    // Create tenant
    fastify.post('/', this.createTenant.bind(this));

    // Get tenant info
    fastify.get('/:tenantId', this.getTenant.bind(this));

    // Update tenant
    fastify.put('/:tenantId', this.updateTenant.bind(this));

    // Delete tenant
    fastify.delete('/:tenantId', this.deleteTenant.bind(this));

    // Tenant configuration
    fastify.get('/:tenantId/config', this.getTenantConfig.bind(this));
    fastify.put('/:tenantId/config', this.updateTenantConfig.bind(this));

    // Tenant usage and metrics
    fastify.get('/:tenantId/usage', this.getTenantUsage.bind(this));
    fastify.get('/:tenantId/metrics', this.getTenantMetrics.bind(this));

    // Tenant team management
    fastify.get('/:tenantId/team', this.getTenantTeam.bind(this));
    fastify.post('/:tenantId/team', this.addTeamMember.bind(this));
    fastify.delete('/:tenantId/team/:userId', this.removeTeamMember.bind(this));
  }

  /**
   * Documentation service routes
   */
  private async documentationRoutes(fastify: FastifyInstance): Promise<void> {
    // Site management
    fastify.get('/:tenantId/sites', this.getDocumentationSites.bind(this));
    fastify.post('/:tenantId/sites', this.createDocumentationSite.bind(this));
    fastify.get(
      '/:tenantId/sites/:siteId',
      this.getDocumentationSite.bind(this),
    );
    fastify.put(
      '/:tenantId/sites/:siteId',
      this.updateDocumentationSite.bind(this),
    );
    fastify.delete(
      '/:tenantId/sites/:siteId',
      this.deleteDocumentationSite.bind(this),
    );

    // Content operations
    fastify.get('/:tenantId/sites/:siteId/pages', this.getPages.bind(this));
    fastify.post('/:tenantId/sites/:siteId/pages', this.createPage.bind(this));
    fastify.get(
      '/:tenantId/sites/:siteId/pages/:pageId',
      this.getPage.bind(this),
    );
    fastify.put(
      '/:tenantId/sites/:siteId/pages/:pageId',
      this.updatePage.bind(this),
    );
    fastify.delete(
      '/:tenantId/sites/:siteId/pages/:pageId',
      this.deletePage.bind(this),
    );

    // Search and navigation
    fastify.get(
      '/:tenantId/sites/:siteId/search',
      this.searchContent.bind(this),
    );
    fastify.get(
      '/:tenantId/sites/:siteId/navigation',
      this.getNavigation.bind(this),
    );
    fastify.put(
      '/:tenantId/sites/:siteId/navigation',
      this.updateNavigation.bind(this),
    );

    // Publishing and deployment
    fastify.post(
      '/:tenantId/sites/:siteId/publish',
      this.publishSite.bind(this),
    );
    fastify.get(
      '/:tenantId/sites/:siteId/deployments',
      this.getDeployments.bind(this),
    );
    fastify.post(
      '/:tenantId/sites/:siteId/rollback/:deploymentId',
      this.rollbackDeployment.bind(this),
    );
  }

  /**
   * Content management routes
   */
  private async contentRoutes(fastify: FastifyInstance): Promise<void> {
    // Asset management
    fastify.post('/:tenantId/assets', this.uploadAsset.bind(this));
    fastify.get('/:tenantId/assets', this.getAssets.bind(this));
    fastify.get('/:tenantId/assets/:assetId', this.getAsset.bind(this));
    fastify.delete('/:tenantId/assets/:assetId', this.deleteAsset.bind(this));

    // Templates and themes
    fastify.get('/:tenantId/templates', this.getTemplates.bind(this));
    fastify.post('/:tenantId/templates', this.createTemplate.bind(this));
    fastify.get('/:tenantId/themes', this.getThemes.bind(this));
    fastify.post('/:tenantId/themes', this.createTheme.bind(this));

    // Version control and collaboration
    fastify.get('/:tenantId/versions', this.getVersions.bind(this));
    fastify.post('/:tenantId/versions', this.createVersion.bind(this));
    fastify.post(
      '/:tenantId/merge-requests',
      this.createMergeRequest.bind(this),
    );
    fastify.get('/:tenantId/merge-requests', this.getMergeRequests.bind(this));

    // Content workflow
    fastify.get('/:tenantId/workflows', this.getWorkflows.bind(this));
    fastify.post('/:tenantId/workflows', this.createWorkflow.bind(this));
    fastify.post(
      '/:tenantId/workflows/:workflowId/trigger',
      this.triggerWorkflow.bind(this),
    );
  }

  /**
   * Create new tenant
   */
  async createTenant(
    request: FastifyRequest<{ Body: CreateTenantRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const tenantData = request.body;

      // Validate tenant data
      await this.validateTenantData(tenantData);

      // Check if tenant already exists
      const existingTenant = Array.from(this.tenants.values()).find(
        (t) => t.name === tenantData.name,
      );
      if (existingTenant) {
        return reply.code(409).send({ error: 'Tenant already exists' });
      }

      // Create tenant
      const tenant: Tenant = {
        id: this.generateTenantId(),
        name: tenantData.name,
        plan: tenantData.plan || 'starter',
        status: 'active',
        configuration: await this.generateTenantConfiguration(tenantData),
        usage: {
          storage: 0,
          bandwidth: 0,
          requests: 0,
          users: 0,
          sites: 0,
        },
        billing: {
          plan: tenantData.plan || 'starter',
          status: 'active',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usage: {},
          invoices: [],
        },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          owner: tenantData.owner,
          tags: tenantData.tags || [],
        },
      };

      this.tenants.set(tenant.id, tenant);

      // Initialize tenant resources
      await this.initializeTenantResources(tenant);

      // Start billing cycle
      await this.billingEngine.initializeTenantBilling(tenant);

      this.emit('tenant:created', { tenantId: tenant.id, name: tenant.name });

      reply.code(201).send({
        tenant: this.sanitizeTenantForAPI(tenant),
        message: 'Tenant created successfully',
      });
    } catch (error) {
      this.emit('tenant:creation-failed', { error });
      reply.code(500).send({ error: 'Failed to create tenant' });
    }
  }

  /**
   * Get tenant information
   */
  async getTenant(
    request: FastifyRequest<{ Params: { tenantId: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const tenantId = request.params.tenantId;
      const tenant = this.tenants.get(tenantId);

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Check access permissions
      const hasAccess = await this.checkTenantAccess(request, tenantId);
      if (!hasAccess) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      reply.send({
        tenant: this.sanitizeTenantForAPI(tenant),
      });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to retrieve tenant' });
    }
  }

  /**
   * Create documentation site for tenant
   */
  async createDocumentationSite(
    request: FastifyRequest<{
      Params: { tenantId: string };
      Body: CreateSiteRequest;
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const tenantId = request.params.tenantId;
      const siteData = request.body;

      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Check tenant limits
      const canCreateSite = await this.checkTenantLimits(tenant, 'sites');
      if (!canCreateSite) {
        return reply
          .code(429)
          .send({ error: 'Site limit reached for current plan' });
      }

      // Create documentation site
      const site = await this.createDocumentationSiteForTenant(
        tenant,
        siteData,
      );

      // Update tenant usage
      tenant.usage.sites++;

      this.emit('site:created', { tenantId, siteId: site.id });

      reply.code(201).send({
        site,
        message: 'Documentation site created successfully',
      });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to create documentation site' });
    }
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(
    period: AnalyticsPeriod,
  ): Promise<PlatformAnalytics> {
    const analytics: PlatformAnalytics = {
      timestamp: new Date(),
      period,
      platform: {
        totalTenants: this.tenants.size,
        activeTenants: Array.from(this.tenants.values()).filter(
          (t) => t.status === 'active',
        ).length,
        totalSites: await this.getTotalSites(),
        totalUsers: await this.getTotalUsers(),
        totalRequests: await this.getTotalRequests(period),
        totalRevenue: await this.getTotalRevenue(period),
      },
      tenants: {
        byPlan: await this.getTenantsByPlan(),
        byStatus: await this.getTenantsByStatus(),
        growth: await this.getTenantGrowth(period),
        churn: await this.getTenantChurn(period),
      },
      usage: {
        storage: await this.getTotalStorage(),
        bandwidth: await this.getTotalBandwidth(period),
        requests: await this.getTotalAPIRequests(period),
        features: await this.getFeatureUsage(period),
      },
      performance: {
        apiLatency: await this.getAPILatency(period),
        uptime: await this.getPlatformUptime(period),
        errorRate: await this.getErrorRate(period),
        throughput: await this.getThroughput(period),
      },
      billing: {
        mrr: await this.getMonthlyRecurringRevenue(),
        arr: await this.getAnnualRecurringRevenue(),
        averageRevenuePerTenant: await this.getAverageRevenuePerTenant(),
        conversionRate: await this.getConversionRate(period),
      },
    };

    return analytics;
  }

  /**
   * Generate API documentation
   */
  async generateAPIDocumentation(): Promise<APIDocumentation> {
    const documentation: APIDocumentation = {
      openapi: '3.0.3',
      info: {
        title: 'Documentation Platform API',
        version: this.config.api.version,
        description:
          'Comprehensive API for the Documentation as a Service Platform',
        contact: {
          name: 'API Support',
          url: 'https://docs.example.com/support',
          email: 'api-support@example.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: this.config.api.baseUrl,
          description: 'Production server',
        },
      ],
      paths: await this.generateAPIPaths(),
      components: {
        schemas: await this.generateAPISchemas(),
        securitySchemes: await this.generateSecuritySchemes(),
        responses: await this.generateCommonResponses(),
        parameters: await this.generateCommonParameters(),
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
      tags: await this.generateAPITags(),
    };

    return documentation;
  }

  /**
   * Setup marketplace for extensions and integrations
   */
  async setupMarketplace(): Promise<void> {
    await this.marketplaceManager.initialize();

    // Register core marketplace routes
    this.fastify.register(
      async (fastify) => {
        // Browse marketplace
        fastify.get('/browse', this.browseMarketplace.bind(this));

        // Get extension details
        fastify.get('/extensions/:extensionId', this.getExtension.bind(this));

        // Install extension
        fastify.post(
          '/extensions/:extensionId/install',
          this.installExtension.bind(this),
        );

        // Uninstall extension
        fastify.delete(
          '/extensions/:extensionId/uninstall',
          this.uninstallExtension.bind(this),
        );

        // Extension management
        fastify.get('/installed', this.getInstalledExtensions.bind(this));
        fastify.put(
          '/extensions/:extensionId/configure',
          this.configureExtension.bind(this),
        );
      },
      { prefix: '/api/v1/marketplace' },
    );

    this.emit('marketplace:initialized');
  }

  /**
   * Handle webhook integrations
   */
  async setupWebhooks(): Promise<void> {
    // Webhook registration
    this.fastify.post('/api/v1/webhooks', this.createWebhook.bind(this));
    this.fastify.get('/api/v1/webhooks', this.getWebhooks.bind(this));
    this.fastify.put(
      '/api/v1/webhooks/:webhookId',
      this.updateWebhook.bind(this),
    );
    this.fastify.delete(
      '/api/v1/webhooks/:webhookId',
      this.deleteWebhook.bind(this),
    );

    // Webhook delivery
    this.fastify.post(
      '/api/v1/webhooks/:webhookId/test',
      this.testWebhook.bind(this),
    );

    this.emit('webhooks:initialized');
  }

  /**
   * Generate comprehensive platform report
   */
  async generatePlatformReport(period: ReportPeriod): Promise<PlatformReport> {
    const report: PlatformReport = {
      period,
      generatedAt: new Date(),
      executive: {
        totalTenants: this.tenants.size,
        revenue: await this.getTotalRevenue(period),
        growth: await this.getPlatformGrowth(period),
        health: await this.getPlatformHealth(),
      },
      tenants: {
        acquisition: await this.getTenantAcquisition(period),
        retention: await this.getTenantRetention(period),
        satisfaction: await this.getTenantSatisfaction(period),
        support: await this.getSupportMetrics(period),
      },
      technical: {
        performance: await this.getTechnicalPerformance(period),
        reliability: await this.getSystemReliability(period),
        security: await this.getSecurityMetrics(period),
        capacity: await this.getCapacityMetrics(period),
      },
      business: {
        revenue: await this.getRevenueAnalysis(period),
        costs: await this.getCostAnalysis(period),
        profitability: await this.getProfitabilityAnalysis(period),
        forecast: await this.getBusinessForecast(period),
      },
      recommendations: await this.generatePlatformRecommendations(period),
    };

    return report;
  }

  // Private utility methods
  private async validateTenantData(data: CreateTenantRequest): Promise<void> {
    // Implement validation logic
    if (!data.name || data.name.length < 3) {
      throw new Error('Tenant name must be at least 3 characters');
    }
    if (!data.owner) {
      throw new Error('Tenant owner is required');
    }
  }

  private generateTenantId(): string {
    return `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateTenantConfiguration(
    data: CreateTenantRequest,
  ): Promise<TenantConfiguration> {
    return {
      domain: `${data.name}.docs.example.com`,
      customDomain: data.customDomain,
      branding: data.branding || {},
      features: this.getPlanFeatures(data.plan || 'starter'),
      limits: this.getPlanLimits(data.plan || 'starter'),
      integrations: [],
      security: {
        sso: false,
        mfa: false,
        ipWhitelist: [],
      },
    };
  }

  private async initializeTenantResources(tenant: Tenant): Promise<void> {
    // Initialize tenant-specific resources
    // Database schemas, storage buckets, etc.
  }

  private sanitizeTenantForAPI(tenant: Tenant): any {
    // Remove sensitive information before sending to API
    const { billing, ...publicData } = tenant;
    return publicData;
  }

  private async checkTenantAccess(
    request: FastifyRequest,
    tenantId: string,
  ): Promise<boolean> {
    // Implement access control logic
    return true; // Placeholder
  }

  private async checkTenantLimits(
    tenant: Tenant,
    resource: string,
  ): Promise<boolean> {
    const limits = tenant.configuration.limits;
    switch (resource) {
      case 'sites':
        return tenant.usage.sites < limits.sites;
      case 'users':
        return tenant.usage.users < limits.users;
      case 'storage':
        return tenant.usage.storage < limits.storage;
      default:
        return true;
    }
  }

  private getPlanFeatures(plan: TenantPlan): PlanFeatures {
    const features = {
      starter: {
        sites: 1,
        users: 5,
        storage: '1GB',
        bandwidth: '10GB',
        customDomain: false,
        sso: false,
        analytics: 'basic',
        support: 'community',
      },
      professional: {
        sites: 10,
        users: 25,
        storage: '50GB',
        bandwidth: '100GB',
        customDomain: true,
        sso: true,
        analytics: 'advanced',
        support: 'email',
      },
      enterprise: {
        sites: 'unlimited',
        users: 'unlimited',
        storage: '500GB',
        bandwidth: '1TB',
        customDomain: true,
        sso: true,
        analytics: 'enterprise',
        support: 'priority',
      },
    };
    return features[plan] || features.starter;
  }

  private getPlanLimits(plan: TenantPlan): PlanLimits {
    const limits = {
      starter: {
        sites: 1,
        users: 5,
        storage: 1073741824,
        bandwidth: 10737418240,
      },
      professional: {
        sites: 10,
        users: 25,
        storage: 53687091200,
        bandwidth: 107374182400,
      },
      enterprise: {
        sites: -1,
        users: -1,
        storage: 536870912000,
        bandwidth: 1099511627776,
      },
    };
    return limits[plan] || limits.starter;
  }

  // Route handlers (abbreviated for space)
  private async handleLogin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement login logic
  }

  private async handleRegister(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement registration logic
  }

  private async handleTokenRefresh(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement token refresh logic
  }

  private async handleLogout(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement logout logic
  }

  private async handleOAuthLogin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement OAuth login logic
  }

  private async handleOAuthCallback(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Implement OAuth callback logic
  }

  private async getAPIKeys(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Get user's API keys
  }

  private async createAPIKey(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Create new API key
  }

  private async revokeAPIKey(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Revoke API key
  }

  // Additional route handlers would be implemented here...
}

// Supporting classes
class APIGateway {
  constructor(private config: APIConfig) {}

  async initialize(): Promise<void> {
    // Initialize API gateway
  }
}

class BillingEngine {
  constructor(private config: BillingConfig) {}

  async initializeTenantBilling(tenant: Tenant): Promise<void> {
    // Initialize billing for tenant
  }
}

class MarketplaceManager {
  constructor(private config: MarketplaceConfig) {}

  async initialize(): Promise<void> {
    // Initialize marketplace
  }
}

class PlatformAnalyticsEngine {
  constructor(private config: PlatformAnalyticsConfig) {}

  async trackEvent(event: string, data: any): Promise<void> {
    // Track analytics event
  }
}

// Type definitions
export type TenantPlan = 'starter' | 'professional' | 'enterprise';
export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'cancelled';
export type ServiceCategory =
  | 'core'
  | 'integration'
  | 'analytics'
  | 'security'
  | 'content';
export type AnalyticsPeriod = '24h' | '7d' | '30d' | '90d' | '1y';
export type ReportPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface CreateTenantRequest {
  name: string;
  owner: string;
  plan?: TenantPlan;
  customDomain?: string;
  branding?: TenantBranding;
  tags?: string[];
}

export interface CreateSiteRequest {
  name: string;
  description?: string;
  template?: string;
  theme?: string;
  domain?: string;
  configuration?: any;
}

export interface TenantConfiguration {
  domain: string;
  customDomain?: string;
  branding: TenantBranding;
  features: PlanFeatures;
  limits: PlanLimits;
  integrations: string[];
  security: SecurityConfiguration;
}

export interface TenantUsage {
  storage: number;
  bandwidth: number;
  requests: number;
  users: number;
  sites: number;
}

export interface TenantBilling {
  plan: TenantPlan;
  status: string;
  nextBillingDate: Date;
  usage: Record<string, number>;
  invoices: Invoice[];
}

export interface TenantMetadata {
  createdAt: Date;
  lastModified: Date;
  owner: string;
  tags: string[];
}

export interface PlatformAnalytics {
  timestamp: Date;
  period: AnalyticsPeriod;
  platform: {
    totalTenants: number;
    activeTenants: number;
    totalSites: number;
    totalUsers: number;
    totalRequests: number;
    totalRevenue: number;
  };
  tenants: {
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
    growth: number;
    churn: number;
  };
  usage: {
    storage: number;
    bandwidth: number;
    requests: number;
    features: Record<string, number>;
  };
  performance: {
    apiLatency: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  billing: {
    mrr: number;
    arr: number;
    averageRevenuePerTenant: number;
    conversionRate: number;
  };
}

export interface PlatformReport {
  period: ReportPeriod;
  generatedAt: Date;
  executive: {
    totalTenants: number;
    revenue: number;
    growth: number;
    health: number;
  };
  tenants: {
    acquisition: number;
    retention: number;
    satisfaction: number;
    support: any;
  };
  technical: {
    performance: any;
    reliability: any;
    security: any;
    capacity: any;
  };
  business: {
    revenue: any;
    costs: any;
    profitability: any;
    forecast: any;
  };
  recommendations: string[];
}

// Configuration interfaces
export interface AuthenticationConfig {
  methods: string[];
  providers: OAuthProvider[];
  session: SessionConfig;
  apiKeys: APIKeyConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  requests: number;
  window: string;
  skipSuccessfulRequests: boolean;
}

export interface VersioningConfig {
  strategy: 'header' | 'path' | 'query';
  defaultVersion: string;
  deprecationPolicy: DeprecationPolicy;
}

export interface APIDocumentationConfig {
  enabled: boolean;
  path: string;
  ui: 'swagger' | 'redoc' | 'rapidoc';
  authentication: boolean;
}

export interface SDKConfig {
  languages: string[];
  generation: boolean;
  distribution: string[];
}

export interface IsolationConfig {
  level: 'shared' | 'dedicated' | 'hybrid';
  database: boolean;
  storage: boolean;
  compute: boolean;
}

export interface CustomizationConfig {
  branding: boolean;
  themes: boolean;
  domains: boolean;
  features: boolean;
}

export interface ResourceConfig {
  allocation: 'shared' | 'dedicated';
  scaling: AutoScalingConfig;
  limits: ResourceLimits;
}

export interface TenantBillingConfig {
  model: 'subscription' | 'usage' | 'hybrid';
  cycles: string[];
  currency: string;
  taxes: boolean;
}

export interface OnboardingConfig {
  steps: OnboardingStep[];
  automation: boolean;
  templates: boolean;
}

export interface BillingConfig {
  provider: string;
  currency: string;
  taxes: TaxConfig;
  invoicing: InvoicingConfig;
  payments: PaymentConfig;
}

export interface MarketplaceConfig {
  enabled: boolean;
  categories: string[];
  review: ReviewConfig;
  monetization: MonetizationConfig;
}

export interface IntegrationConfig {
  webhooks: WebhookConfig;
  apis: ExternalAPIConfig[];
  sso: SSOConfig;
  imports: ImportConfig;
}

export interface ScalingConfig {
  auto: boolean;
  metrics: ScalingMetric[];
  limits: ScalingLimits;
}

export interface GovernanceConfig {
  policies: GovernancePolicy[];
  compliance: ComplianceFramework[];
  auditing: AuditingConfig;
}

export interface PlatformAnalyticsConfig {
  enabled: boolean;
  realtime: boolean;
  retention: number;
  anonymization: boolean;
}

// Supporting type definitions
export interface TenantBranding {
  logo?: string;
  colors?: Record<string, string>;
  fonts?: string[];
  favicon?: string;
}

export interface PlanFeatures {
  sites: number | 'unlimited';
  users: number | 'unlimited';
  storage: string;
  bandwidth: string;
  customDomain: boolean;
  sso: boolean;
  analytics: string;
  support: string;
}

export interface PlanLimits {
  sites: number;
  users: number;
  storage: number;
  bandwidth: number;
}

export interface SecurityConfiguration {
  sso: boolean;
  mfa: boolean;
  ipWhitelist: string[];
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: Date;
  paidDate?: Date;
}

export interface EndpointDocumentation {
  summary: string;
  description: string;
  tags: string[];
  parameters: Parameter[];
  responses: Response[];
  examples: Example[];
}

export interface ServiceDependency {
  service: string;
  version: string;
  required: boolean;
}

export interface ServiceConfiguration {
  enabled: boolean;
  settings: Record<string, any>;
  resources: ResourceAllocation;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  metrics: HealthMetric[];
}

export interface APIDocumentation {
  openapi: string;
  info: APIInfo;
  servers: APIServer[];
  paths: Record<string, any>;
  components: APIComponents;
  security: SecurityRequirement[];
  tags: APITag[];
}

export interface APIInfo {
  title: string;
  version: string;
  description: string;
  contact: ContactInfo;
  license: LicenseInfo;
}

export interface APIServer {
  url: string;
  description: string;
}

export interface APIComponents {
  schemas: Record<string, any>;
  securitySchemes: Record<string, any>;
  responses: Record<string, any>;
  parameters: Record<string, any>;
}

export interface SecurityRequirement {
  [key: string]: string[];
}

export interface APITag {
  name: string;
  description: string;
}

export interface ContactInfo {
  name: string;
  url: string;
  email: string;
}

export interface LicenseInfo {
  name: string;
  url: string;
}

// Additional supporting interfaces
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  scope: string[];
}

export interface SessionConfig {
  duration: number;
  storage: string;
  secure: boolean;
}

export interface APIKeyConfig {
  enabled: boolean;
  prefix: string;
  expiration: number;
}

export interface DeprecationPolicy {
  notice: number;
  sunset: number;
  communication: string[];
}

export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetMetrics: ScalingMetric[];
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  storage: string;
  network: string;
}

export interface OnboardingStep {
  name: string;
  type: string;
  required: boolean;
  configuration: any;
}

export interface TaxConfig {
  enabled: boolean;
  provider: string;
  rates: Record<string, number>;
}

export interface InvoicingConfig {
  provider: string;
  template: string;
  delivery: string[];
}

export interface PaymentConfig {
  methods: string[];
  providers: PaymentProvider[];
  retry: RetryConfig;
}

export interface PaymentProvider {
  name: string;
  type: string;
  configuration: any;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: number;
}

export interface ReviewConfig {
  required: boolean;
  criteria: ReviewCriteria[];
  process: ReviewProcess;
}

export interface ReviewCriteria {
  name: string;
  weight: number;
  required: boolean;
}

export interface ReviewProcess {
  steps: string[];
  reviewers: number;
  automation: boolean;
}

export interface MonetizationConfig {
  enabled: boolean;
  models: string[];
  revenue: RevenueSharing;
}

export interface RevenueSharing {
  platform: number;
  developer: number;
  currency: string;
}

export interface WebhookConfig {
  enabled: boolean;
  maxRetries: number;
  timeout: number;
  signatures: boolean;
}

export interface ExternalAPIConfig {
  name: string;
  url: string;
  authentication: any;
  rateLimit: RateLimitConfig;
}

export interface SSOConfig {
  providers: SSOProvider[];
  mapping: AttributeMapping;
  provisioning: UserProvisioning;
}

export interface SSOProvider {
  name: string;
  type: string;
  configuration: any;
}

export interface AttributeMapping {
  email: string;
  name: string;
  groups: string;
}

export interface UserProvisioning {
  automatic: boolean;
  deprovisioning: boolean;
  groupSync: boolean;
}

export interface ImportConfig {
  formats: string[];
  sources: string[];
  validation: boolean;
}

export interface ScalingMetric {
  name: string;
  type: string;
  threshold: number;
}

export interface ScalingLimits {
  maxScale: number;
  cooldown: number;
  resources: ResourceLimits;
}

export interface GovernancePolicy {
  name: string;
  type: string;
  rules: PolicyRule[];
  enforcement: string;
}

export interface PolicyRule {
  condition: string;
  action: string;
  parameters: any;
}

export interface ComplianceFramework {
  name: string;
  requirements: string[];
  controls: string[];
  reporting: boolean;
}

export interface AuditingConfig {
  enabled: boolean;
  events: string[];
  retention: number;
  destinations: string[];
}

export interface Parameter {
  name: string;
  in: string;
  required: boolean;
  schema: any;
  description: string;
}

export interface Response {
  code: number;
  description: string;
  schema: any;
}

export interface Example {
  name: string;
  request: any;
  response: any;
}

export interface ResourceAllocation {
  cpu: number;
  memory: number;
  storage: number;
}

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}
