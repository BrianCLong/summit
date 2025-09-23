/**
 * Policy Enforcement Middleware
 *
 * Express middleware that enforces policy evaluation for all gateway routes,
 * including privacy, licensing, and governance policies with real-time
 * evaluation and caching.
 */

import { Request, Response, NextFunction } from 'express';
import { OPAIntegration } from '../policy/opa-integration';
import { PrivacyReasoner } from '../policy/privacy-reasoner';
import { LicensingEnforcement } from '../policy/licensing-enforcement';
import { logger } from '../utils/logger';
import { performance } from 'perf_hooks';

interface PolicyEnforcementOptions {
  skipRoutes?: string[];
  skipMethods?: string[];
  enablePrivacy?: boolean;
  enableLicensing?: boolean;
  enableGovernance?: boolean;
  cacheEnabled?: boolean;
  metricsEnabled?: boolean;
}

interface PolicyContext {
  tenantId: string;
  userId?: string;
  resource: string;
  action: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  ip: string;
  userAgent?: string;
}

interface PolicyResult {
  allowed: boolean;
  violations: Array<{
    type: string;
    severity: string;
    message: string;
    resource?: string;
    action?: string;
  }>;
  reason?: string;
  metadata?: any;
  evaluationTime: number;
  cacheHit: boolean;
}

export class PolicyEnforcementMiddleware {
  private opaIntegration: OPAIntegration;
  private privacyReasoner: PrivacyReasoner;
  private licensingEnforcement: LicensingEnforcement;
  private options: PolicyEnforcementOptions;
  private metrics: Map<string, any>;

  constructor(
    opaIntegration: OPAIntegration,
    privacyReasoner: PrivacyReasoner,
    licensingEnforcement: LicensingEnforcement,
    options: PolicyEnforcementOptions = {}
  ) {
    this.opaIntegration = opaIntegration;
    this.privacyReasoner = privacyReasoner;
    this.licensingEnforcement = licensingEnforcement;
    this.options = {
      skipRoutes: ['/health', '/metrics', '/graphql-playground'],
      skipMethods: ['OPTIONS'],
      enablePrivacy: true,
      enableLicensing: true,
      enableGovernance: true,
      cacheEnabled: true,
      metricsEnabled: true,
      ...options
    };
    this.metrics = new Map();
  }

  // Main middleware function
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        // Skip policy enforcement for certain routes/methods
        if (this.shouldSkipRequest(req)) {
          return next();
        }

        // Extract policy context
        const context = this.extractPolicyContext(req);

        // Validate required context
        if (!context.tenantId) {
          return this.sendPolicyError(res, 'Missing tenant ID', 400);
        }

        // Evaluate policies
        const result = await this.evaluatePolicies(context);

        // Record metrics
        if (this.options.metricsEnabled) {
          this.recordMetrics(context, result, performance.now() - startTime);
        }

        // Handle policy violations
        if (!result.allowed) {
          return this.handlePolicyViolation(res, result);
        }

        // Add policy context to request for downstream use
        req.policyContext = {
          tenantId: context.tenantId,
          userId: context.userId,
          evaluationResult: result
        };

        // Continue to next middleware
        next();

      } catch (error) {
        logger.error('Policy enforcement middleware error', {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method
        });

        // In case of policy evaluation failure, decide on fail-open vs fail-closed
        if (process.env.POLICY_FAIL_MODE === 'open') {
          logger.warn('Policy evaluation failed, failing open', { path: req.path });
          next();
        } else {
          this.sendPolicyError(res, 'Policy evaluation failed', 503);
        }
      }
    };
  }

  // Check if request should skip policy enforcement
  private shouldSkipRequest(req: Request): boolean {
    const { method, path } = req;

    // Skip based on method
    if (this.options.skipMethods?.includes(method)) {
      return true;
    }

    // Skip based on route patterns
    if (this.options.skipRoutes?.some(route => {
      if (route.includes('*')) {
        const pattern = route.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(path);
      }
      return path === route || path.startsWith(route);
    })) {
      return true;
    }

    return false;
  }

  // Extract policy evaluation context from request
  private extractPolicyContext(req: Request): PolicyContext {
    // Extract tenant ID from header, token, or subdomain
    const tenantId = req.headers['x-tenant-id'] as string ||
                    req.user?.tenantId ||
                    this.extractTenantFromSubdomain(req);

    // Extract user ID from authenticated user
    const userId = req.user?.id;

    // Determine resource and action from request
    const { resource, action } = this.determineResourceAction(req);

    return {
      tenantId,
      userId,
      resource,
      action,
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query,
      body: req.body,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent']
    };
  }

  // Extract tenant ID from subdomain
  private extractTenantFromSubdomain(req: Request): string {
    const host = req.headers.host;
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      // Basic validation - could be more sophisticated
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }
    return '';
  }

  // Determine resource and action from request
  private determineResourceAction(req: Request): { resource: string; action: string } {
    const { method, path } = req;

    // GraphQL requests
    if (path === '/graphql' && req.body?.query) {
      const query = req.body.query;

      // Extract operation name and type
      const operationMatch = query.match(/(query|mutation|subscription)\s+(\w+)?/i);
      if (operationMatch) {
        const operationType = operationMatch[1].toLowerCase();
        const operationName = operationMatch[2] || 'anonymous';

        return {
          resource: `graphql.${operationName}`,
          action: operationType
        };
      }
    }

    // REST API requests
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const resourcePath = pathSegments.join('.');
      const action = this.methodToAction(method);

      return {
        resource: resourcePath,
        action
      };
    }

    return {
      resource: 'unknown',
      action: method.toLowerCase()
    };
  }

  // Convert HTTP method to policy action
  private methodToAction(method: string): string {
    const actionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete',
      'HEAD': 'read',
      'OPTIONS': 'options'
    };

    return actionMap[method.toUpperCase()] || method.toLowerCase();
  }

  // Evaluate all applicable policies
  private async evaluatePolicies(context: PolicyContext): Promise<PolicyResult> {
    const startTime = performance.now();
    const violations: any[] = [];
    let cacheHit = false;

    try {
      // Comprehensive policy evaluation via OPA
      const opaResult = await this.opaIntegration.evaluatePolicy({
        tenantId: context.tenantId,
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        context: {
          method: context.method,
          path: context.path,
          headers: context.headers,
          query: context.query,
          ip: context.ip,
          userAgent: context.userAgent
        },
        skipCache: !this.options.cacheEnabled
      });

      if (opaResult.violations) {
        violations.push(...opaResult.violations);
      }

      cacheHit = opaResult.cacheHit || false;

      // Additional privacy policy evaluation if enabled
      if (this.options.enablePrivacy && this.requiresPrivacyEvaluation(context)) {
        const privacyResult = await this.evaluatePrivacyPolicy(context);
        if (privacyResult.violations) {
          violations.push(...privacyResult.violations);
        }
      }

      // Additional licensing enforcement if enabled
      if (this.options.enableLicensing) {
        const licensingResult = await this.evaluateLicensing(context);
        if (licensingResult.violations) {
          violations.push(...licensingResult.violations);
        }
      }

      const allowed = violations.length === 0;
      const evaluationTime = performance.now() - startTime;

      return {
        allowed,
        violations,
        reason: allowed ? 'Policy evaluation passed' : `Policy violations: ${violations.map(v => v.message).join(', ')}`,
        metadata: {
          evaluationTime,
          cacheHit,
          violationCount: violations.length,
          context: {
            resource: context.resource,
            action: context.action,
            tenantId: context.tenantId
          }
        },
        evaluationTime,
        cacheHit
      };

    } catch (error) {
      logger.error('Policy evaluation failed', {
        error: error.message,
        context,
        evaluationTime: performance.now() - startTime
      });

      throw error;
    }
  }

  // Check if privacy policy evaluation is required
  private requiresPrivacyEvaluation(context: PolicyContext): boolean {
    // Privacy evaluation for data operations
    const dataOperations = ['create', 'update', 'read'];
    const dataResources = ['user', 'profile', 'entity', 'document'];

    return dataOperations.includes(context.action) &&
           dataResources.some(resource => context.resource.includes(resource));
  }

  // Evaluate privacy policy
  private async evaluatePrivacyPolicy(context: PolicyContext): Promise<{ violations: any[] }> {
    try {
      const result = await this.privacyReasoner.evaluatePrivacyPolicy({
        tenantId: context.tenantId,
        userId: context.userId,
        dataType: this.inferDataType(context.resource),
        purpose: this.inferPurpose(context.action),
        context: {
          resource: context.resource,
          action: context.action,
          ip: context.ip
        }
      });

      const violations = [];

      if (!result.allowed) {
        violations.push({
          type: 'PRIVACY_BREACH',
          severity: 'HIGH',
          message: `Privacy policy violation: ${result.reason || 'Access denied'}`,
          resource: context.resource,
          action: context.action
        });
      }

      return { violations };

    } catch (error) {
      logger.error('Privacy policy evaluation failed', { error, context });
      return { violations: [] };
    }
  }

  // Evaluate licensing constraints
  private async evaluateLicensing(context: PolicyContext): Promise<{ violations: any[] }> {
    try {
      const result = await this.licensingEnforcement.enforceLicense({
        tenantId: context.tenantId,
        operation: `${context.action}_${context.resource}`,
        resource: context.resource,
        quantity: 1,
        context: {
          method: context.method,
          path: context.path,
          ip: context.ip
        }
      });

      const violations = [];

      if (!result.allowed) {
        violations.push({
          type: 'LICENSE_EXCEEDED',
          severity: 'HIGH',
          message: `License violation: ${result.violations?.[0]?.message || 'License limit exceeded'}`,
          resource: context.resource,
          action: context.action
        });
      }

      return { violations };

    } catch (error) {
      logger.error('License enforcement failed', { error, context });
      return { violations: [] };
    }
  }

  // Infer data type from resource
  private inferDataType(resource: string): string {
    const dataTypeMap: Record<string, string> = {
      'user': 'personal_data',
      'profile': 'personal_data',
      'entity': 'business_data',
      'document': 'document_data',
      'analytics': 'analytics_data'
    };

    for (const [key, value] of Object.entries(dataTypeMap)) {
      if (resource.includes(key)) {
        return value;
      }
    }

    return 'general_data';
  }

  // Infer purpose from action
  private inferPurpose(action: string): string {
    const purposeMap: Record<string, string> = {
      'create': 'data_processing',
      'read': 'data_access',
      'update': 'data_processing',
      'delete': 'data_deletion',
      'export': 'data_export',
      'analyze': 'analytics'
    };

    return purposeMap[action] || 'general_processing';
  }

  // Handle policy violation response
  private handlePolicyViolation(res: Response, result: PolicyResult): void {
    const statusCode = this.getViolationStatusCode(result.violations);

    logger.warn('Policy violation detected', {
      violations: result.violations,
      reason: result.reason,
      evaluationTime: result.evaluationTime
    });

    res.status(statusCode).json({
      error: 'Policy violation',
      message: result.reason,
      violations: result.violations.map(v => ({
        type: v.type,
        severity: v.severity,
        message: v.message
      })),
      timestamp: new Date().toISOString(),
      evaluationTime: result.evaluationTime
    });
  }

  // Get appropriate HTTP status code for violations
  private getViolationStatusCode(violations: any[]): number {
    if (violations.some(v => v.type === 'LICENSE_EXCEEDED')) {
      return 402; // Payment Required
    }

    if (violations.some(v => v.type === 'PRIVACY_BREACH')) {
      return 451; // Unavailable For Legal Reasons
    }

    if (violations.some(v => v.severity === 'CRITICAL')) {
      return 403; // Forbidden
    }

    return 403; // Forbidden (default)
  }

  // Send policy error response
  private sendPolicyError(res: Response, message: string, statusCode: number): void {
    res.status(statusCode).json({
      error: 'Policy error',
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Record policy evaluation metrics
  private recordMetrics(context: PolicyContext, result: PolicyResult, totalTime: number): void {
    const key = `${context.resource}.${context.action}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        violations: 0,
        totalTime: 0,
        cacheHits: 0
      });
    }

    const metrics = this.metrics.get(key);
    metrics.count++;
    metrics.totalTime += totalTime;

    if (!result.allowed) {
      metrics.violations++;
    }

    if (result.cacheHit) {
      metrics.cacheHits++;
    }

    // Log metrics periodically
    if (metrics.count % 100 === 0) {
      logger.info('Policy enforcement metrics', {
        resource: key,
        count: metrics.count,
        violationRate: (metrics.violations / metrics.count * 100).toFixed(2) + '%',
        avgResponseTime: (metrics.totalTime / metrics.count).toFixed(2) + 'ms',
        cacheHitRate: (metrics.cacheHits / metrics.count * 100).toFixed(2) + '%'
      });
    }
  }

  // Get current metrics
  getMetrics(): Record<string, any> {
    const metricsObj: Record<string, any> = {};

    for (const [key, value] of this.metrics.entries()) {
      metricsObj[key] = {
        ...value,
        violationRate: value.violations / value.count,
        avgResponseTime: value.totalTime / value.count,
        cacheHitRate: value.cacheHits / value.count
      };
    }

    return metricsObj;
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      policyContext?: {
        tenantId: string;
        userId?: string;
        evaluationResult: PolicyResult;
      };
    }
  }
}

// Factory function for middleware
export function createPolicyEnforcementMiddleware(
  opaIntegration: OPAIntegration,
  privacyReasoner: PrivacyReasoner,
  licensingEnforcement: LicensingEnforcement,
  options?: PolicyEnforcementOptions
) {
  const middleware = new PolicyEnforcementMiddleware(
    opaIntegration,
    privacyReasoner,
    licensingEnforcement,
    options
  );

  return middleware.middleware();
}