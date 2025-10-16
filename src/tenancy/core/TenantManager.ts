/**
 * @fileoverview Multi-tenant SaaS Architecture - Core Tenant Management
 * Implements tenant isolation, resource management, and cross-tenant security boundaries
 * with enterprise-grade scalability and security features.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createHash, randomUUID } from 'crypto';

/**
 * Tenant configuration and metadata interface
 */
export interface TenantConfig {
  tenantId: string;
  name: string;
  subdomain: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'government';
  status: 'active' | 'suspended' | 'deactivated' | 'trial';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    industry?: string;
    companySize?: string;
    region: string;
    dataResidency: string[];
    complianceRequirements: string[];
  };
  limits: ResourceLimits;
  features: FeatureFlags;
  security: SecurityConfig;
}

/**
 * Resource allocation and usage limits per tenant
 */
export interface ResourceLimits {
  maxUsers: number;
  maxNodes: number;
  maxEdges: number;
  maxGraphs: number;
  maxQueries: number;
  maxStorage: number; // bytes
  maxConcurrentSessions: number;
  maxApiCallsPerMinute: number;
  maxAnalysisJobs: number;
  retentionDays: number;
}

/**
 * Feature flags configuration per tenant
 */
export interface FeatureFlags {
  advancedAnalytics: boolean;
  realTimeCollaboration: boolean;
  aiInsights: boolean;
  customIntegrations: boolean;
  auditLogging: boolean;
  sso: boolean;
  mfa: boolean;
  dataExport: boolean;
  whiteLabeling: boolean;
  prioritySupport: boolean;
}

/**
 * Security configuration per tenant
 */
export interface SecurityConfig {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  ipWhitelist: string[];
  allowedDomains: string[];
  sessionTimeout: number; // minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
  };
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Tenant isolation context for requests
 */
export interface TenantContext {
  tenantId: string;
  userId?: string;
  sessionId: string;
  permissions: string[];
  metadata: Record<string, any>;
  isolationLevel: 'strict' | 'standard' | 'relaxed';
}

/**
 * Resource usage tracking interface
 */
export interface ResourceUsage {
  tenantId: string;
  timestamp: Date;
  metrics: {
    activeUsers: number;
    totalNodes: number;
    totalEdges: number;
    totalGraphs: number;
    storageUsed: number;
    queriesExecuted: number;
    apiCalls: number;
    analysisJobsRunning: number;
    bandwidthUsed: number;
  };
  limits: ResourceLimits;
  utilization: Record<string, number>; // percentage utilization
}

/**
 * Core tenant management system with enterprise features
 */
export class TenantManager extends EventEmitter {
  private tenants: Map<string, TenantConfig> = new Map();
  private tenantsByDomain: Map<string, string> = new Map();
  private usageTracking: Map<string, ResourceUsage[]> = new Map();
  private isolationPolicies: Map<string, any> = new Map();

  constructor(
    private config: {
      enableUsageTracking: boolean;
      usageRetentionDays: number;
      defaultTier: string;
      isolationMode: 'database' | 'schema' | 'row';
    },
  ) {
    super();
    this.initializeDefaultPolicies();
    this.startUsageTracking();
  }

  /**
   * Create new tenant with comprehensive setup
   */
  async createTenant(
    tenantData: Omit<TenantConfig, 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<TenantConfig> {
    const tenantId = this.generateTenantId();
    const now = new Date();

    const tenant: TenantConfig = {
      tenantId,
      createdAt: now,
      updatedAt: now,
      ...tenantData,
      limits: this.getDefaultLimitsForTier(tenantData.tier),
      features: this.getDefaultFeaturesForTier(tenantData.tier),
      security: this.getDefaultSecurityConfig(tenantData.tier),
    };

    // Validate tenant configuration
    await this.validateTenantConfig(tenant);

    // Set up tenant isolation
    await this.setupTenantIsolation(tenant);

    // Initialize resource tracking
    this.initializeResourceTracking(tenantId);

    // Store tenant configuration
    this.tenants.set(tenantId, tenant);
    this.tenantsByDomain.set(tenant.subdomain, tenantId);

    this.emit('tenant:created', { tenant, timestamp: now });

    console.log(`Tenant created: ${tenantId} (${tenant.name})`);
    return tenant;
  }

  /**
   * Get tenant by ID with validation
   */
  async getTenant(tenantId: string): Promise<TenantConfig | null> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    // Validate tenant status
    if (tenant.status === 'deactivated') {
      throw new Error(`Tenant ${tenantId} is deactivated`);
    }

    return tenant;
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantByDomain(domain: string): Promise<TenantConfig | null> {
    const tenantId = this.tenantsByDomain.get(domain);
    if (!tenantId) {
      return null;
    }

    return this.getTenant(tenantId);
  }

  /**
   * Update tenant configuration with validation
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<TenantConfig>,
  ): Promise<TenantConfig> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const updatedTenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };

    await this.validateTenantConfig(updatedTenant);
    this.tenants.set(tenantId, updatedTenant);

    this.emit('tenant:updated', {
      tenantId,
      updates,
      tenant: updatedTenant,
      timestamp: new Date(),
    });

    return updatedTenant;
  }

  /**
   * Create tenant context for request isolation
   */
  createTenantContext(
    tenantId: string,
    userId?: string,
    additionalContext?: Partial<TenantContext>,
  ): TenantContext {
    return {
      tenantId,
      userId,
      sessionId: randomUUID(),
      permissions: [],
      metadata: {},
      isolationLevel: 'strict',
      ...additionalContext,
    };
  }

  /**
   * Validate tenant resource usage against limits
   */
  async validateResourceUsage(
    tenantId: string,
    resourceType: keyof ResourceLimits,
    requestedAmount: number = 1,
  ): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const currentUsage = await this.getCurrentUsage(tenantId);
    const limit = tenant.limits[resourceType] as number;
    const current =
      (currentUsage.metrics[
        resourceType as keyof typeof currentUsage.metrics
      ] as number) || 0;

    const wouldExceed = current + requestedAmount > limit;

    if (wouldExceed) {
      this.emit('tenant:limitExceeded', {
        tenantId,
        resourceType,
        current,
        limit,
        requested: requestedAmount,
        timestamp: new Date(),
      });
    }

    return !wouldExceed;
  }

  /**
   * Get current resource usage for tenant
   */
  async getCurrentUsage(tenantId: string): Promise<ResourceUsage> {
    const usageHistory = this.usageTracking.get(tenantId) || [];
    const latest = usageHistory[usageHistory.length - 1];

    if (!latest) {
      // Return empty usage if no history
      const tenant = await this.getTenant(tenantId);
      return {
        tenantId,
        timestamp: new Date(),
        metrics: {
          activeUsers: 0,
          totalNodes: 0,
          totalEdges: 0,
          totalGraphs: 0,
          storageUsed: 0,
          queriesExecuted: 0,
          apiCalls: 0,
          analysisJobsRunning: 0,
          bandwidthUsed: 0,
        },
        limits: tenant?.limits || this.getDefaultLimitsForTier('starter'),
        utilization: {},
      };
    }

    return latest;
  }

  /**
   * Record resource usage metrics
   */
  async recordUsage(
    tenantId: string,
    metrics: Partial<ResourceUsage['metrics']>,
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const currentUsage = await this.getCurrentUsage(tenantId);
    const newMetrics = { ...currentUsage.metrics, ...metrics };

    // Calculate utilization percentages
    const utilization: Record<string, number> = {};
    Object.entries(newMetrics).forEach(([key, value]) => {
      const limitKey = this.getCorrespondingLimit(key);
      if (limitKey && tenant.limits[limitKey]) {
        utilization[key] = (value / (tenant.limits[limitKey] as number)) * 100;
      }
    });

    const usage: ResourceUsage = {
      tenantId,
      timestamp: new Date(),
      metrics: newMetrics,
      limits: tenant.limits,
      utilization,
    };

    const usageHistory = this.usageTracking.get(tenantId) || [];
    usageHistory.push(usage);

    // Maintain retention policy
    const retentionCutoff =
      Date.now() - this.config.usageRetentionDays * 24 * 60 * 60 * 1000;
    const filteredHistory = usageHistory.filter(
      (u) => u.timestamp.getTime() > retentionCutoff,
    );

    this.usageTracking.set(tenantId, filteredHistory);

    this.emit('tenant:usageRecorded', {
      tenantId,
      usage,
      timestamp: new Date(),
    });

    // Check for limit violations
    Object.entries(utilization).forEach(([resource, percent]) => {
      if (percent > 90) {
        this.emit('tenant:approachingLimit', {
          tenantId,
          resource,
          utilization: percent,
          timestamp: new Date(),
        });
      }
    });
  }

  /**
   * Generate cryptographically secure tenant ID
   */
  private generateTenantId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = randomUUID().replace(/-/g, '');
    const hash = createHash('sha256')
      .update(`${timestamp}-${randomBytes}`)
      .digest('hex');
    return `tenant_${hash.substring(0, 16)}`;
  }

  /**
   * Get default resource limits based on tier
   */
  private getDefaultLimitsForTier(tier: string): ResourceLimits {
    const limits = {
      starter: {
        maxUsers: 5,
        maxNodes: 1000,
        maxEdges: 5000,
        maxGraphs: 5,
        maxQueries: 100,
        maxStorage: 1024 * 1024 * 100, // 100MB
        maxConcurrentSessions: 5,
        maxApiCallsPerMinute: 100,
        maxAnalysisJobs: 1,
        retentionDays: 30,
      },
      professional: {
        maxUsers: 25,
        maxNodes: 10000,
        maxEdges: 50000,
        maxGraphs: 25,
        maxQueries: 1000,
        maxStorage: 1024 * 1024 * 1000, // 1GB
        maxConcurrentSessions: 25,
        maxApiCallsPerMinute: 1000,
        maxAnalysisJobs: 5,
        retentionDays: 90,
      },
      enterprise: {
        maxUsers: 1000,
        maxNodes: 1000000,
        maxEdges: 5000000,
        maxGraphs: 1000,
        maxQueries: 10000,
        maxStorage: 1024 * 1024 * 1024 * 10, // 10GB
        maxConcurrentSessions: 1000,
        maxApiCallsPerMinute: 10000,
        maxAnalysisJobs: 50,
        retentionDays: 365,
      },
      government: {
        maxUsers: 10000,
        maxNodes: 10000000,
        maxEdges: 50000000,
        maxGraphs: 10000,
        maxQueries: 100000,
        maxStorage: 1024 * 1024 * 1024 * 100, // 100GB
        maxConcurrentSessions: 10000,
        maxApiCallsPerMinute: 100000,
        maxAnalysisJobs: 500,
        retentionDays: 2555, // 7 years
      },
    };

    return limits[tier as keyof typeof limits] || limits.starter;
  }

  /**
   * Get default feature flags based on tier
   */
  private getDefaultFeaturesForTier(tier: string): FeatureFlags {
    const features = {
      starter: {
        advancedAnalytics: false,
        realTimeCollaboration: false,
        aiInsights: false,
        customIntegrations: false,
        auditLogging: false,
        sso: false,
        mfa: false,
        dataExport: true,
        whiteLabeling: false,
        prioritySupport: false,
      },
      professional: {
        advancedAnalytics: true,
        realTimeCollaboration: true,
        aiInsights: true,
        customIntegrations: false,
        auditLogging: true,
        sso: false,
        mfa: true,
        dataExport: true,
        whiteLabeling: false,
        prioritySupport: false,
      },
      enterprise: {
        advancedAnalytics: true,
        realTimeCollaboration: true,
        aiInsights: true,
        customIntegrations: true,
        auditLogging: true,
        sso: true,
        mfa: true,
        dataExport: true,
        whiteLabeling: true,
        prioritySupport: true,
      },
      government: {
        advancedAnalytics: true,
        realTimeCollaboration: true,
        aiInsights: true,
        customIntegrations: true,
        auditLogging: true,
        sso: true,
        mfa: true,
        dataExport: true,
        whiteLabeling: true,
        prioritySupport: true,
      },
    };

    return features[tier as keyof typeof features] || features.starter;
  }

  /**
   * Get default security configuration based on tier
   */
  private getDefaultSecurityConfig(tier: string): SecurityConfig {
    const configs = {
      starter: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        ipWhitelist: [],
        allowedDomains: [],
        sessionTimeout: 480, // 8 hours
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          maxAge: 90,
        },
        auditLevel: 'basic' as const,
      },
      professional: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        ipWhitelist: [],
        allowedDomains: [],
        sessionTimeout: 240, // 4 hours
        passwordPolicy: {
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 60,
        },
        auditLevel: 'detailed' as const,
      },
      enterprise: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        ipWhitelist: [],
        allowedDomains: [],
        sessionTimeout: 120, // 2 hours
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 30,
        },
        auditLevel: 'comprehensive' as const,
      },
      government: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        ipWhitelist: [],
        allowedDomains: [],
        sessionTimeout: 60, // 1 hour
        passwordPolicy: {
          minLength: 14,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 15,
        },
        auditLevel: 'comprehensive' as const,
      },
    };

    return configs[tier as keyof typeof configs] || configs.starter;
  }

  /**
   * Validate tenant configuration
   */
  private async validateTenantConfig(tenant: TenantConfig): Promise<void> {
    // Validate subdomain uniqueness
    const existingTenantId = this.tenantsByDomain.get(tenant.subdomain);
    if (existingTenantId && existingTenantId !== tenant.tenantId) {
      throw new Error(`Subdomain already exists: ${tenant.subdomain}`);
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(tenant.subdomain)) {
      throw new Error('Invalid subdomain format');
    }

    // Validate tier
    const validTiers = ['starter', 'professional', 'enterprise', 'government'];
    if (!validTiers.includes(tenant.tier)) {
      throw new Error(`Invalid tier: ${tenant.tier}`);
    }

    // Validate data residency requirements
    if (tenant.metadata.dataResidency?.length === 0) {
      throw new Error('Data residency requirements must be specified');
    }
  }

  /**
   * Set up tenant isolation based on configuration
   */
  private async setupTenantIsolation(tenant: TenantConfig): Promise<void> {
    switch (this.config.isolationMode) {
      case 'database':
        await this.setupDatabaseIsolation(tenant);
        break;
      case 'schema':
        await this.setupSchemaIsolation(tenant);
        break;
      case 'row':
        await this.setupRowIsolation(tenant);
        break;
    }
  }

  /**
   * Set up database-level isolation (most secure)
   */
  private async setupDatabaseIsolation(tenant: TenantConfig): Promise<void> {
    // Implementation would create dedicated database for tenant
    console.log(`Setting up database isolation for tenant: ${tenant.tenantId}`);
  }

  /**
   * Set up schema-level isolation (balanced)
   */
  private async setupSchemaIsolation(tenant: TenantConfig): Promise<void> {
    // Implementation would create dedicated schema for tenant
    console.log(`Setting up schema isolation for tenant: ${tenant.tenantId}`);
  }

  /**
   * Set up row-level isolation (shared database)
   */
  private async setupRowIsolation(tenant: TenantConfig): Promise<void> {
    // Implementation would configure row-level security
    console.log(`Setting up row isolation for tenant: ${tenant.tenantId}`);
  }

  /**
   * Initialize default isolation policies
   */
  private initializeDefaultPolicies(): void {
    // Cross-tenant access prevention policies
    this.isolationPolicies.set('crossTenantAccess', {
      enabled: true,
      strictMode: true,
      allowedExceptions: [],
    });

    // Data sharing policies
    this.isolationPolicies.set('dataSharing', {
      enabled: false,
      requireExplicitConsent: true,
      auditSharing: true,
    });
  }

  /**
   * Initialize resource tracking for tenant
   */
  private initializeResourceTracking(tenantId: string): void {
    if (this.config.enableUsageTracking) {
      this.usageTracking.set(tenantId, []);
    }
  }

  /**
   * Start background usage tracking
   */
  private startUsageTracking(): void {
    if (this.config.enableUsageTracking) {
      setInterval(() => {
        this.collectUsageMetrics();
      }, 60000); // Collect every minute
    }
  }

  /**
   * Collect usage metrics for all tenants
   */
  private async collectUsageMetrics(): Promise<void> {
    for (const [tenantId] of this.tenants) {
      try {
        // In real implementation, this would query actual usage from databases/services
        const mockMetrics = await this.collectTenantMetrics(tenantId);
        await this.recordUsage(tenantId, mockMetrics);
      } catch (error) {
        console.error(
          `Failed to collect metrics for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Collect actual metrics for a specific tenant
   */
  private async collectTenantMetrics(
    tenantId: string,
  ): Promise<Partial<ResourceUsage['metrics']>> {
    // Mock implementation - in reality, would query actual usage
    return {
      activeUsers: Math.floor(Math.random() * 10),
      totalNodes: Math.floor(Math.random() * 1000),
      totalEdges: Math.floor(Math.random() * 5000),
      storageUsed: Math.floor(Math.random() * 1024 * 1024 * 50),
      queriesExecuted: Math.floor(Math.random() * 100),
      apiCalls: Math.floor(Math.random() * 50),
    };
  }

  /**
   * Get corresponding limit key for a metric
   */
  private getCorrespondingLimit(
    metricKey: string,
  ): keyof ResourceLimits | null {
    const mapping: Record<string, keyof ResourceLimits> = {
      activeUsers: 'maxUsers',
      totalNodes: 'maxNodes',
      totalEdges: 'maxEdges',
      totalGraphs: 'maxGraphs',
      queriesExecuted: 'maxQueries',
      storageUsed: 'maxStorage',
      apiCalls: 'maxApiCallsPerMinute',
      analysisJobsRunning: 'maxAnalysisJobs',
    };

    return mapping[metricKey] || null;
  }
}

// Export singleton instance
export const tenantManager = new TenantManager({
  enableUsageTracking: true,
  usageRetentionDays: 90,
  defaultTier: 'starter',
  isolationMode: 'schema',
});
