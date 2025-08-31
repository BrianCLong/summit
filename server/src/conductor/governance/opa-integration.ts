// Open Policy Agent (OPA) Integration for Conductor
// Implements policy-based authorization and tenant isolation

import axios from 'axios';
import { prometheusConductorMetrics } from '../observability/prometheus';
import crypto from 'crypto';

export interface PolicyContext {
  tenantId: string;
  userId?: string;
  role: string;
  action: string;
  resource: string;
  resourceAttributes?: Record<string, any>;
  sessionContext?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp: number;
    sessionId?: string;
  };
  businessContext?: {
    costCenter?: string;
    businessUnit?: string;
    project?: string;
  };
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  conditions?: string[];
  tags?: string[];
  auditLog?: {
    logLevel: 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, any>;
  };
  dataFilters?: {
    tenantScope: string[];
    fieldMask?: string[];
    rowLevelFilters?: Record<string, any>;
  };
}

export interface TenantIsolationPolicy {
  tenantId: string;
  isolationLevel: 'strict' | 'moderate' | 'permissive';
  allowedCrossTenantActions: string[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy: {
    defaultRetentionDays: number;
    categories: Record<string, number>;
  };
  auditRequirements: {
    logAllActions: boolean;
    logDataAccess: boolean;
    realTimeAlerting: boolean;
  };
}

/**
 * OPA Policy Engine Client
 */
class OpaPolicyEngine {
  private opaBaseUrl: string;
  private policyCache: Map<string, { decision: PolicyDecision; expiry: number }>;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor() {
    this.opaBaseUrl = process.env.OPA_BASE_URL || 'http://localhost:8181';
    this.policyCache = new Map();
  }

  /**
   * Evaluate policy decision
   */
  async evaluatePolicy(policyName: string, context: PolicyContext): Promise<PolicyDecision> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(policyName, context);
      const cached = this.policyCache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        prometheusConductorMetrics.recordOperationalEvent('opa_cache_hit', true);
        return cached.decision;
      }

      // Prepare OPA input
      const opaInput = {
        input: {
          ...context,
          timestamp: Date.now(),
          policyVersion: process.env.OPA_POLICY_VERSION || '1.0'
        }
      };

      // Call OPA
      const response = await axios.post(
        `${this.opaBaseUrl}/v1/data/${policyName}`,
        opaInput,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': crypto.randomUUID()
          }
        }
      );

      const decision = this.parseOpaResponse(response.data);
      
      // Cache the decision
      this.policyCache.set(cacheKey, {
        decision,
        expiry: Date.now() + this.CACHE_TTL
      });

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent('opa_policy_evaluation', decision.allow);
      prometheusConductorMetrics.recordOperationalMetric('opa_evaluation_time', Date.now() - startTime);

      return decision;

    } catch (error) {
      console.error('OPA policy evaluation failed:', error);
      
      prometheusConductorMetrics.recordOperationalEvent('opa_evaluation_error', false);
      
      // Fail-safe: deny by default
      return {
        allow: false,
        reason: `Policy evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        auditLog: {
          logLevel: 'error',
          message: 'OPA policy evaluation failure',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      };
    }
  }

  /**
   * Evaluate tenant isolation policy
   */
  async evaluateTenantIsolation(context: PolicyContext): Promise<PolicyDecision> {
    return this.evaluatePolicy('conductor/tenant_isolation', context);
  }

  /**
   * Evaluate data access policy
   */
  async evaluateDataAccess(context: PolicyContext & { dataType: string; sensitivity: string }): Promise<PolicyDecision> {
    return this.evaluatePolicy('conductor/data_access', context);
  }

  /**
   * Evaluate cross-tenant operation policy
   */
  async evaluateCrossTenantOperation(context: PolicyContext & { targetTenantId: string }): Promise<PolicyDecision> {
    return this.evaluatePolicy('conductor/cross_tenant', context);
  }

  /**
   * Load tenant isolation configuration
   */
  async loadTenantConfig(tenantId: string): Promise<TenantIsolationPolicy | null> {
    try {
      const response = await axios.get(`${this.opaBaseUrl}/v1/data/conductor/tenant_config/${tenantId}`, {
        timeout: 3000
      });

      return response.data.result || null;

    } catch (error) {
      console.error(`Failed to load tenant config for ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Parse OPA response
   */
  private parseOpaResponse(opaResponse: any): PolicyDecision {
    const result = opaResponse.result || {};
    
    return {
      allow: result.allow || false,
      reason: result.reason || 'No reason provided',
      conditions: result.conditions || [],
      tags: result.tags || [],
      auditLog: result.audit_log ? {
        logLevel: result.audit_log.level || 'info',
        message: result.audit_log.message || 'Policy evaluation',
        metadata: result.audit_log.metadata || {}
      } : undefined,
      dataFilters: result.data_filters ? {
        tenantScope: result.data_filters.tenant_scope || [],
        fieldMask: result.data_filters.field_mask || [],
        rowLevelFilters: result.data_filters.row_level_filters || {}
      } : undefined
    };
  }

  /**
   * Generate cache key for policy decision
   */
  private generateCacheKey(policyName: string, context: PolicyContext): string {
    const keyData = {
      policy: policyName,
      tenant: context.tenantId,
      user: context.userId,
      role: context.role,
      action: context.action,
      resource: context.resource
    };

    return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.policyCache.clear();
    prometheusConductorMetrics.recordOperationalEvent('opa_cache_cleared', true);
  }
}

/**
 * Tag Propagation System
 */
export class TagPropagationSystem {
  private tagStore: Map<string, Set<string>>;
  
  constructor() {
    this.tagStore = new Map();
  }

  /**
   * Propagate tags from source to target resource
   */
  async propagateTags(sourceResourceId: string, targetResourceId: string, context: PolicyContext): Promise<void> {
    try {
      const sourceTags = this.tagStore.get(sourceResourceId) || new Set();
      const targetTags = this.tagStore.get(targetResourceId) || new Set();

      // Add tenant isolation tag
      const tenantTag = `tenant:${context.tenantId}`;
      targetTags.add(tenantTag);

      // Add data classification tags based on source
      for (const tag of sourceTags) {
        if (tag.startsWith('classification:') || tag.startsWith('sensitivity:')) {
          targetTags.add(tag);
        }
      }

      // Add operation context tags
      targetTags.add(`created_by:${context.userId || 'system'}`);
      targetTags.add(`action:${context.action}`);
      targetTags.add(`timestamp:${Date.now()}`);

      // Store updated tags
      this.tagStore.set(targetResourceId, targetTags);

      console.log(`Tags propagated from ${sourceResourceId} to ${targetResourceId}:`, Array.from(targetTags));

    } catch (error) {
      console.error('Tag propagation failed:', error);
      prometheusConductorMetrics.recordOperationalEvent('tag_propagation_error', false);
    }
  }

  /**
   * Get resource tags
   */
  getResourceTags(resourceId: string): string[] {
    const tags = this.tagStore.get(resourceId);
    return tags ? Array.from(tags) : [];
  }

  /**
   * Add tags to resource
   */
  addTags(resourceId: string, tags: string[]): void {
    const existingTags = this.tagStore.get(resourceId) || new Set();
    tags.forEach(tag => existingTags.add(tag));
    this.tagStore.set(resourceId, existingTags);
  }

  /**
   * Filter resources by tenant isolation
   */
  filterResourcesByTenant(resourceIds: string[], tenantId: string): string[] {
    return resourceIds.filter(id => {
      const tags = this.getResourceTags(id);
      return tags.includes(`tenant:${tenantId}`);
    });
  }

  /**
   * Validate cross-tenant access
   */
  validateCrossTenantAccess(resourceId: string, requestingTenantId: string): boolean {
    const tags = this.getResourceTags(resourceId);
    
    // Check if resource belongs to requesting tenant
    if (tags.includes(`tenant:${requestingTenantId}`)) {
      return true;
    }

    // Check for explicit cross-tenant sharing tags
    return tags.some(tag => 
      tag.startsWith('shared_with:') && tag.includes(requestingTenantId)
    );
  }
}

/**
 * Tenant Isolation Middleware
 */
export class TenantIsolationMiddleware {
  private opaPolicyEngine: OpaPolicyEngine;
  private tagPropagationSystem: TagPropagationSystem;

  constructor() {
    this.opaPolicyEngine = new OpaPolicyEngine();
    this.tagPropagationSystem = new TagPropagationSystem();
  }

  /**
   * Express middleware for tenant isolation
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const tenantId = this.extractTenantId(req);
        const userId = req.user?.sub;
        const role = req.user?.role || 'user';
        
        if (!tenantId) {
          return res.status(400).json({
            success: false,
            message: 'Tenant ID is required'
          });
        }

        // Build policy context
        const context: PolicyContext = {
          tenantId,
          userId,
          role,
          action: this.mapHttpMethodToAction(req.method),
          resource: this.extractResourceFromPath(req.path),
          sessionContext: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: Date.now(),
            sessionId: req.sessionID
          }
        };

        // Evaluate tenant isolation policy
        const decision = await this.opaPolicyEngine.evaluateTenantIsolation(context);

        if (!decision.allow) {
          // Log policy violation
          console.warn('Tenant isolation policy violation:', {
            tenantId,
            userId,
            action: context.action,
            resource: context.resource,
            reason: decision.reason
          });

          prometheusConductorMetrics.recordOperationalEvent('tenant_isolation_violation', false);

          return res.status(403).json({
            success: false,
            message: 'Access denied by tenant isolation policy',
            reason: decision.reason
          });
        }

        // Add policy context to request
        req.policyContext = context;
        req.policyDecision = decision;

        // Apply data filters if specified
        if (decision.dataFilters) {
          req.dataFilters = decision.dataFilters;
        }

        next();

      } catch (error) {
        console.error('Tenant isolation middleware error:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Tenant isolation check failed'
        });
      }
    };
  }

  /**
   * GraphQL middleware for field-level isolation
   */
  graphqlMiddleware() {
    return {
      requestDidStart() {
        return {
          willSendResponse(requestContext: any) {
            // Apply field masking based on tenant isolation policy
            if (requestContext.request.http?.policyDecision?.dataFilters?.fieldMask) {
              const fieldMask = requestContext.request.http.policyDecision.dataFilters.fieldMask;
              requestContext.response.body = this.applyFieldMask(requestContext.response.body, fieldMask);
            }
          }
        };
      },

      applyFieldMask(responseBody: any, fieldMask: string[]): any {
        if (!responseBody || !fieldMask.length) return responseBody;
        
        // Recursively remove masked fields
        const maskFields = (obj: any): any => {
          if (Array.isArray(obj)) {
            return obj.map(maskFields);
          }
          
          if (obj && typeof obj === 'object') {
            const masked = { ...obj };
            fieldMask.forEach(field => {
              delete masked[field];
            });
            
            // Recursively mask nested objects
            Object.keys(masked).forEach(key => {
              masked[key] = maskFields(masked[key]);
            });
            
            return masked;
          }
          
          return obj;
        };

        return maskFields(responseBody);
      }
    };
  }

  private extractTenantId(req: any): string | null {
    return req.headers['x-tenant-id'] || 
           req.user?.tenantId || 
           req.query.tenantId || 
           null;
  }

  private mapHttpMethodToAction(method: string): string {
    const methodMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete'
    };
    
    return methodMap[method] || 'unknown';
  }

  private extractResourceFromPath(path: string): string {
    // Extract resource type from API path
    const pathParts = path.split('/').filter(Boolean);
    return pathParts.length > 1 ? pathParts[1] : 'unknown';
  }
}

// Export singletons
export const opaPolicyEngine = new OpaPolicyEngine();
export const tagPropagationSystem = new TagPropagationSystem();
export const tenantIsolationMiddleware = new TenantIsolationMiddleware();