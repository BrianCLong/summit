/**
 * Gateway OPA ABAC Enforcement Middleware
 * 
 * Implements attribute-based access control enforcement at the API gateway layer
 * using Open Policy Agent (OPA) to evaluate ABAC policies for all incoming requests
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';
import { metrics } from '../observability/metrics.js';
import { TenantContext } from '../tenancy/types.js';

// OPA client for policy evaluation
class OpaClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.OPA_BASE_URL || 'http://localhost:8181';
    this.timeout = parseInt(process.env.OPA_TIMEOUT_MS || '5000');
  }

  async evaluate(input: any): Promise<{ allow: boolean; reason?: string; attributes?: any }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/v1/data/baseline_abac/allow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': uuidv4(),
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('OPA policy evaluation failed', {
          status: response.status,
          statusText: response.statusText,
          url: `${this.baseUrl}/v1/data/baseline_abac/allow`,
        });
        
        // Fail closed - if OPA is unavailable, deny the request
        return {
          allow: false,
          reason: `Policy service unavailable: ${response.status} ${response.statusText}`,
        };
      }

      const result = await response.json();
      
      if (typeof result.result === 'boolean') {
        return { 
          allow: result.result,
          reason: result.result ? 'Access granted by ABAC policy' : 'Access denied by ABAC policy'
        };
      } else if (typeof result.result === 'object') {
        return {
          allow: result.result.allow || false,
          reason: result.result.reason || (result.result.allow ? 'Access granted' : 'Access denied'),
          attributes: result.result.attributes || {},
        };
      } else {
        logger.warn('Unexpected OPA result format', { result });
        return { 
          allow: false, 
          reason: 'Invalid policy evaluation result' 
        };
      }
    } catch (error: any) {
      logger.error('OPA evaluation error', {
        error: error.message,
        stack: error.stack,
        input: JSON.stringify(input, null, 2).substring(0, 500), // Truncate for safety
      });
      
      // Fail closed - if OPA is unreachable, deny the request
      return {
        allow: false,
        reason: `Policy evaluation error: ${error.message}`,
      };
    }
  }
}

// Create a single instance of the OPA client
const opaClient = new OpaClient();

// Convert HTTP method to action
const httpMethodToAction = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
};

// Determine resource type from URL path
const pathToResourceType = (path: string): string => {
  // Normalize path by removing trailing slashes
  const normalizedPath = path.replace(/\/$/, '');
  
  // Common resource mappings
  const resourceMap: { [key: string]: string } = {
    '/api/users': 'user',
    '/api/user': 'user',
    '/api/tenants': 'tenant',
    '/api/tenant': 'tenant',
    '/api/investigations': 'investigation',
    '/api/investigation': 'investigation',
    '/api/entities': 'entity',
    '/api/entity': 'entity',
    '/api/relationships': 'relationship', 
    '/api/relationship': 'relationship',
    '/api/cases': 'case',
    '/api/case': 'case',
    '/api/workflows': 'workflow',
    '/api/workflow': 'workflow',
    '/api/exports': 'export',
    '/api/export': 'export',
    '/api/audits': 'audit',
    '/api/audit': 'audit',
    '/api/config': 'config',
    '/api/policy': 'policy',
    '/api/governance': 'governance',
    '/api/maestro': 'maestro',
    '/api/orchestration': 'orchestration',
  };

  // Try exact match first
  if (resourceMap[normalizedPath]) {
    return resourceMap[normalizedPath];
  }

  // Try partial match (for cases like /api/investigations/123)
  for (const [pathPattern, resourceType] of Object.entries(resourceMap)) {
    if (normalizedPath.startsWith(pathPattern)) {
      return resourceType;
    }
  }

  // Default to 'other' for unrecognized paths
  return 'other';
};

// Extract resource ID from path
const extractResourceId = (path: string): string | null => {
  const segments = path.split('/').filter(segment => segment.length > 0);
  
  // Look for patterns like /api/entities/123 or /api/investigations/xyz
  if (segments.length >= 3) {
    const idSegment = segments[segments.length - 1]; // Last segment
    // Basic validation for common ID formats
    if (idSegment && /^[a-zA-Z0-9_-]+$/.test(idSegment)) {
      return idSegment;
    }
  }
  
  return null;
};

// Get tenant ID from various sources
const extractTenantId = (req: Request): string => {
  // Priority: 1. Header 2. JWT claim 3. Query param 4. Default
  return (
    req.headers['x-tenant-id'] as string ||
    (req.user as any)?.tenant_id ||  // From JWT middleware
    (req.query.tenantId as string) ||
    (req.query['x-tenant-id'] as string) ||
    'default-tenant'
  );
};

// Extract sensitive data tags
const extractSensitiveTags = (req: Request): string[] => {
  const tags: string[] = [];
  
  // Check headers
  if (req.headers['x-data-classification']) {
    const classification = req.headers['x-data-classification'].toString().toLowerCase();
    if (classification.includes('sensitive') || classification.includes('confidential')) {
      tags.push('sensitive');
    }
  }
  
  // Check request body for sensitive indicators
  if (req.body && typeof req.body === 'object') {
    for (const [key] of Object.entries(req.body)) {
      if (typeof key === 'string' && 
          (key.toLowerCase().includes('ssn') || 
           key.toLowerCase().includes('credit') || 
           key.toLowerCase().includes('card') ||
           key.toLowerCase().includes('email') ||
           key.toLowerCase().includes('phone') ||
           key.toLowerCase().includes('password'))) {
        tags.push('pii');
        break;
      }
    }
  }
  
  return tags;
};

export interface AbacMiddlewareOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  bypassForAdmins?: boolean;
  policyTimeoutMs?: number;
}

// Default options
const defaultOptions: AbacMiddlewareOptions = {
  enableLogging: true,
  enableMetrics: true,
  bypassForAdmins: false,
  policyTimeoutMs: 5000,
};

export const createAbacMiddleware = (options: AbacMiddlewareOptions = {}) => {
  const config = { ...defaultOptions, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    try {
      // Skip health checks and public endpoints
      if (req.path === '/health' || req.path === '/ping' || req.path === '/metrics') {
        if (config.enableMetrics) {
          metrics.policyEvaluations.labels('success', 'skipped', 'health').inc();
        }
        return next();
      }

      // Extract user context (assuming JWT middleware ran first)
      const user = req.user as any;
      if (!user) {
        if (config.enableLogging) {
          logger.warn('Request without user context', { requestId, path: req.path, method: req.method });
        }
        
        if (config.enableMetrics) {
          metrics.policyEvaluations.labels('error', 'missing_user_context', req.method).inc();
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'MISSING_AUTH_CONTEXT',
          requestId,
        });
      }

      // Extract tenant context
      const tenantId = extractTenantId(req);
      const tenantContext: TenantContext = {
        tenantId,
        compartments: [], // This would come from tenant configuration
      };

      // Build policy input for OPA
      const policyInput = {
        user: {
          id: user.id || user.sub || 'unknown',
          roles: Array.isArray(user.roles) ? user.roles : [user.role || 'user'],
          tenant_id: tenantId,
          email: user.email,
          authenticated: true,
          multi_factor_authenticated: user.mfa || false,
          authorized_for_sensitive_data: user.privileged || user.role === 'admin',
          hourly_requests: user.hourly_requests || 0, // This would come from rate limiter
        },
        resource: {
          type: pathToResourceType(req.path),
          id: extractResourceId(req.path) || null,
          tenant_id: tenantId,
          visibility: 'private', // Default; could be overridden by endpoint
          tags: extractSensitiveTags(req),
        },
        action: httpMethodToAction(req.method),
        tenant_context: tenantContext,
        request: {
          method: req.method,
          path: req.path,
          query_params: req.query,
          headers: {
            'x-tenant-id': req.headers['x-tenant-id'],
            'x-data-classification': req.headers['x-data-classification'],
            'content-type': req.headers['content-type'],
          },
          ip: req.ip,
          user_agent: req.get('User-Agent'),
        },
        system: {
          maintenance_mode: process.env.MAINTENANCE_MODE === 'true',
          environment: process.env.NODE_ENV || 'development',
        },
      };

      if (config.enableLogging) {
        logger.debug('ABAC policy evaluation input', { 
          requestId, 
          userId: policyInput.user.id, 
          resource: policyInput.resource.type,
          action: policyInput.action,
          tenantId: tenantId,
        });
      }

      // Evaluate policy with OPA
      const evaluationResult = await opaClient.evaluate(policyInput);

      // Record policy evaluation metrics
      if (config.enableMetrics) {
        const outcome = evaluationResult.allow ? 'allowed' : 'denied';
        const resourceType = policyInput.resource.type || 'unknown';
        
        metrics.policyEvaluations.labels(outcome, resourceType, policyInput.action).inc();
        metrics.policyEvaluationDuration.observe(Date.now() - startTime);
      }

      // Log evaluation result if configured
      if (config.enableLogging) {
        logger.info('ABAC policy evaluation', {
          requestId,
          userId: policyInput.user.id,
          resourceType: policyInput.resource.type,
          action: policyInput.action,
          tenantId: tenantId,
          allowed: evaluationResult.allow,
          reason: evaluationResult.reason,
          evaluationTimeMs: Date.now() - startTime,
        });
      }

      // Check if evaluation was allowed
      if (evaluationResult.allow) {
        // Add policy information to request for downstream use
        (req as any).abacDecision = evaluationResult;
        (req as any).abacAttributes = evaluationResult.attributes || {};
        (req as any).tenant = tenantContext;

        next();
      } else {
        // Access denied by ABAC policy
        if (config.enableLogging) {
          logger.warn('Access denied by ABAC policy', {
            requestId,
            userId: policyInput.user.id,
            resourceType: policyInput.resource.type,
            action: policyInput.action,
            tenantId: tenantId,
            reason: evaluationResult.reason,
          });
        }

        res.status(403).json({
          error: 'Access denied by ABAC policy',
          code: 'ABAC_ACCESS_DENIED',
          reason: evaluationResult.reason,
          requestId,
        });
      }
    } catch (error: any) {
      // Internal error during policy evaluation
      if (config.enableLogging) {
        logger.error('ABAC middleware error', {
          requestId,
          error: error.message,
          stack: error.stack,
        });
      }

      if (config.enableMetrics) {
        metrics.policyEvaluations.labels('error', 'middleware_error', req.method).inc();
      }

      // Fail closed - deny access if there's an error in the policy evaluation
      res.status(500).json({
        error: 'Internal policy evaluation error',
        code: 'INTERNAL_POLICY_ERROR',
        requestId,
      });
    }
  };
};

// Create a configured instance of the middleware
export const abacMiddleware = createAbacMiddleware();

// Convenience function for programmatic policy checks
export const checkAbacPermission = (
  userId: string, 
  userRoles: string[], 
  resourceType: string, 
  action: string,
  tenantId: string,
  additionalContext: any = {}
): Promise<{ allowed: boolean; reason?: string }> => {
  const policyInput = {
    user: {
      id: userId,
      roles: userRoles,
      tenant_id: tenantId,
      authenticated: true,
    },
    resource: {
      type: resourceType,
      tenant_id: tenantId,
    },
    action,
    tenant_context: { tenantId },
    ...additionalContext,
  };

  return opaClient.evaluate(policyInput);
};

// Initialize the ABAC enforcement system
export const initAbacEnforcement = async (): Promise<void> => {
  try {
    // Verify OPA connectivity
    const healthCheck = await opaClient.evaluate({
      user: { id: 'health-check', roles: ['system'] },
      resource: { type: 'health' },
      action: 'read',
    });

    if (healthCheck.allow !== undefined) {
      logger.info('ABAC enforcement module initialized successfully');
    } else {
      throw new Error('Could not validate OPA connectivity');
    }
  } catch (error: any) {
    logger.error('Failed to initialize ABAC enforcement:', error);
    throw error;
  }
};
