import { GraphQLFieldConfig, GraphQLResolveInfo } from 'graphql';
import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

interface User {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
}

interface AuthContext {
  user: User;
  req: any;
}

interface OPAInput {
  user: User;
  action: string;
  resource: {
    type: string;
    field?: string;
    args?: any;
  };
  context: {
    tenantId?: string;
    investigationId?: string;
    environment: string;
    ip?: string;
    userAgent?: string;
  };
}

interface OPADecision {
  allow: boolean;
  reason?: string;
}

/**
 * GraphQL Authorization Plugin using Open Policy Agent (OPA)
 * 
 * This middleware intercepts all GraphQL operations and enforces
 * authorization policies defined in Rego files.
 */
export class GraphQLAuthzPlugin {
  private opaUrl: string;
  private enabled: boolean;

  constructor(opaUrl = 'http://localhost:8181') {
    this.opaUrl = opaUrl;
    this.enabled = process.env.OPA_ENABLED !== 'false';
    
    if (!this.enabled) {
      logger.warn('⚠️  OPA authorization is DISABLED - all operations will be allowed');
    }
  }

  /**
   * Apollo Server plugin interface
   */
  requestDidStart() {
    return {
      willSendResponse: async (requestContext: any) => {
        // Log authorization decisions for audit
        if (requestContext.context.authzDecisions) {
          logger.info('Authorization audit', {
            user: requestContext.context.user?.id,
            operation: requestContext.request.operationName,
            decisions: requestContext.context.authzDecisions,
            ip: requestContext.request.http?.ip
          });
        }
      }
    };
  }

  /**
   * Create authorization middleware for individual resolvers
   */
  createResolverMiddleware() {
    return async (
      parent: any,
      args: any,
      context: AuthContext,
      info: GraphQLResolveInfo,
      next: () => any
    ) => {
      // Skip authorization if disabled
      if (!this.enabled) {
        return next();
      }

      // Ensure user is authenticated
      if (!context.user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Build OPA input
        const opaInput = this.buildOPAInput(context, args, info);
        
        // Query OPA for decision
        const decision = await this.queryOPA(opaInput);
        
        // Track decision for audit
        if (!context.authzDecisions) {
          context.authzDecisions = [];
        }
        context.authzDecisions.push({
          field: info.fieldName,
          decision: decision.allow,
          reason: decision.reason
        });

        // Enforce decision
        if (!decision.allow) {
          throw new ForbiddenError(
            `Access denied to ${info.fieldName}: ${decision.reason || 'Policy violation'}`
          );
        }

        return next();
      } catch (error: any) {
        if (error instanceof ForbiddenError || error instanceof AuthenticationError) {
          throw error;
        }
        
        logger.error('Authorization error', {
          error: error.message,
          field: info.fieldName,
          user: context.user.id
        });
        
        // Fail secure - deny on error
        throw new ForbiddenError('Authorization check failed');
      }
    };
  }

  /**
   * Build OPA input from GraphQL context and info
   */
  private buildOPAInput(
    context: AuthContext, 
    args: any, 
    info: GraphQLResolveInfo
  ): OPAInput {
    const operation = info.operation.operation; // 'query' | 'mutation' | 'subscription'
    const fieldName = info.fieldName;
    const parentType = info.parentType.name;
    const returnType = info.returnType.toString().replace(/[[\]!]/g, '');

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
        tenantId: context.user.tenantId,
        permissions: context.user.permissions || []
      },
      action: `${operation}.${fieldName}`,
      resource: {
        type: returnType,
        field: fieldName,
        args: this.sanitizeArgs(args)
      },
      context: {
        tenantId: this.extractTenantId(context, args),
        investigationId: args.investigationId || args.id,
        environment: config.env,
        ip: context.req?.ip,
        userAgent: context.req?.get('user-agent')
      }
    };
  }

  /**
   * Query OPA for authorization decision
   */
  private async queryOPA(input: OPAInput): Promise<OPADecision> {
    try {
      const response = await axios.post(
        `${this.opaUrl}/v1/data/intelgraph/allow`,
        { input },
        { 
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = response.data.result;
      
      if (typeof result === 'boolean') {
        return { allow: result };
      }
      
      if (typeof result === 'object' && result !== null) {
        return {
          allow: result.allow === true,
          reason: result.reason
        };
      }
      
      // Default deny if unexpected response
      logger.warn('Unexpected OPA response format', { result });
      return { allow: false, reason: 'Invalid policy response' };
      
    } catch (error: any) {
      logger.error('OPA query failed', {
        error: error.message,
        action: input.action,
        user: input.user.id
      });
      
      // Fail secure on OPA unavailability
      if (config.env === 'production') {
        return { allow: false, reason: 'Policy engine unavailable' };
      } else {
        // Allow in development if OPA is down
        logger.warn('Allowing operation due to OPA unavailability in development');
        return { allow: true, reason: 'Development mode - OPA unavailable' };
      }
    }
  }

  /**
   * Extract tenant ID from context or args
   */
  private extractTenantId(context: AuthContext, args: any): string | undefined {
    return args.tenantId || 
           context.user.tenantId || 
           context.req?.headers['x-tenant-id'];
  }

  /**
   * Sanitize arguments for policy evaluation (remove sensitive data)
   */
  private sanitizeArgs(args: any): any {
    const sanitized = { ...args };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

/**
 * Field-level authorization directive
 * Usage: @auth(requires: "admin") or @auth(policy: "custom_policy")
 */
export function authDirective() {
  return {
    typeDefs: `
      directive @auth(
        requires: String
        policy: String
      ) on FIELD_DEFINITION | OBJECT
    `,
    transformer: (schema: any) => {
      // Transform schema to add authorization checks
      // This would integrate with the GraphQL schema transformation
      return schema;
    }
  };
}

/**
 * Create authorization middleware for Express/Apollo Server
 */
export function createAuthzMiddleware(opaUrl?: string) {
  const plugin = new GraphQLAuthzPlugin(opaUrl);
  
  return {
    plugin: plugin,
    middleware: plugin.createResolverMiddleware(),
    
    // Utility to check permissions programmatically
    async checkPermission(
      user: User, 
      action: string, 
      resource: any, 
      context: any = {}
    ): Promise<boolean> {
      const input: OPAInput = {
        user,
        action,
        resource,
        context: {
          environment: config.env,
          ...context
        }
      };
      
      const decision = await plugin['queryOPA'](input);
      return decision.allow;
    }
  };
}

/**
 * RBAC helper functions for common checks
 */
export const RBAC = {
  isAdmin: (user: User) => user.role === 'admin',
  isAnalyst: (user: User) => ['analyst', 'senior_analyst'].includes(user.role),
  canAccess: (user: User, resource: string, action: string) => {
    // Quick local checks before OPA
    if (user.role === 'admin') return true;
    if (action === 'read' && RBAC.isAnalyst(user)) return true;
    return false; // Defer to OPA for complex cases
  }
};

export default GraphQLAuthzPlugin;