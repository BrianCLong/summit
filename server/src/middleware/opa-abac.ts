import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { verify, JwtPayload } from 'jsonwebtoken';
import axios from 'axios';
import { trace, context } from '@opentelemetry/api';
import { logger } from '../utils/logger';
import type { User, OPAClient } from '../graphql/intelgraph/types';

const tracer = trace.getTracer('intelgraph-opa-abac');

interface OPAPolicyInput {
  user: User;
  resource: {
    type: string;
    id?: string;
    tenant?: string;
    purpose?: string;
    region?: string;
    pii_flags?: Record<string, boolean>;
  };
  operation_type: 'query' | 'mutation' | 'subscription';
  field_name?: string;
}

interface OPAPolicyResult {
  result: boolean | string[] | Record<string, any>;
}

export class OPAClient implements OPAClient {
  private baseUrl: string;
  private timeout: number;
  private logger = logger.child({ component: 'opa-client' });

  constructor(baseUrl: string, timeout = 5000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  async evaluate(policy: string, input: any): Promise<any> {
    const span = tracer.startSpan('opa-policy-evaluation', {
      attributes: {
        'opa.policy': policy,
        'opa.input.user_tenant': input.user?.tenant || 'unknown',
        'opa.input.resource_type': input.resource?.type || 'unknown',
      },
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/data/${policy.replace(/\./g, '/')}`,
        { input },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result = response.data?.result;

      span.setAttributes({
        'opa.result.type': typeof result,
        'opa.result.allowed': typeof result === 'boolean' ? result : !!result,
        'opa.response.status': response.status,
      });

      this.logger.debug('OPA policy evaluation result', {
        policy,
        input: {
          user_tenant: input.user?.tenant,
          resource_type: input.resource?.type,
        },
        result: typeof result === 'object' ? JSON.stringify(result) : result,
      });

      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });

      this.logger.error('OPA policy evaluation failed', {
        policy,
        error: (error as Error).message,
      });

      // Fail closed - deny access if OPA is unavailable
      return false;
    } finally {
      span.end();
    }
  }
}

/**
 * OIDC JWT token validation middleware
 */
export function validateOIDCToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const span = tracer.startSpan('validate-oidc-token');

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, allow anonymous access
      if (process.env.NODE_ENV === 'development') {
        (req as any).user = {
          id: 'dev-user',
          tenant: 'default',
          roles: ['developer'],
          scopes: [
            'purpose:investigation',
            'purpose:threat-intel',
            'scope:pii',
          ],
          residency: 'US',
          email: 'dev@topicality.co',
        };
        span.setAttributes({ 'auth.mode': 'development' });
        span.end();
        return next();
      }

      span.setStatus({ code: 2, message: 'No authorization header' });
      span.end();
      throw new AuthenticationError('No authorization token provided');
    }

    const token = authHeader.split(' ')[1];
    const issuer = process.env.OIDC_ISSUER || 'https://auth.topicality.co/';

    // In production, implement proper OIDC validation
    // For development/demo, decode without verification
    if (process.env.NODE_ENV === 'development') {
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      (req as any).user = {
        id: decoded.sub || 'demo-user',
        tenant: decoded.tenant || 'default',
        roles: decoded.roles || ['user'],
        scopes: decoded.scopes || ['purpose:investigation'],
        residency: decoded.residency || 'US',
        email: decoded.email,
      };

      span.setAttributes({
        'auth.mode': 'development',
        'user.id': (req as any).user.id,
        'user.tenant': (req as any).user.tenant,
      });

      span.end();
      return next();
    }

    // TODO: Implement proper OIDC validation with issuer verification
    // const publicKey = await getOIDCPublicKey(issuer);
    // const decoded = verify(token, publicKey, { issuer }) as JwtPayload;

    throw new Error('Production OIDC validation not yet implemented');
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: 2, message: (error as Error).message });
    span.end();

    if (error instanceof AuthenticationError) {
      throw error;
    }

    logger.error('Token validation failed', {
      error: (error as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * GraphQL context builder with OPA client
 */
export function buildGraphQLContext(opaClient: OPAClient) {
  return ({ req }: { req: Request }) => {
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const user = (req as any).user as User | undefined;

    return {
      user,
      opa: opaClient,
      requestId,
      // Database connections will be added by the GraphQL server
    };
  };
}

/**
 * Express middleware for OPA authorization
 */
export function opaAuthzMiddleware(opaClient: OPAClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const span = tracer.startSpan('opa-authz-middleware');

    try {
      const user = (req as any).user as User;
      if (!user) {
        span.setStatus({ code: 2, message: 'No user in request' });
        span.end();
        throw new AuthenticationError('Authentication required');
      }

      // For GraphQL requests, we'll do field-level authorization in resolvers
      if (req.path === '/graphql') {
        span.setAttributes({ 'request.type': 'graphql' });
        span.end();
        return next();
      }

      // For REST endpoints, check general API access
      const policyInput: OPAPolicyInput = {
        user,
        resource: {
          type: 'api',
          tenant: user.tenant,
        },
        operation_type: req.method.toLowerCase() as any,
      };

      const allowed = await opaClient.evaluate(
        'intelgraph.abac.allow',
        policyInput,
      );

      if (!allowed) {
        span.setStatus({ code: 2, message: 'Access denied by policy' });
        span.end();
        throw new ForbiddenError('Access denied by authorization policy');
      }

      span.setAttributes({
        'authz.allowed': true,
        'user.tenant': user.tenant,
      });

      span.end();
      next();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      span.end();

      if (
        error instanceof AuthenticationError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      logger.error('OPA authorization middleware failed', {
        error: (error as Error).message,
      });

      throw new ForbiddenError('Authorization check failed');
    }
  };
}

/**
 * Field-level authorization directive for GraphQL
 */
export function createAuthzDirective(opaClient: OPAClient) {
  return class AuthzDirective {
    visitFieldDefinition(field: any, details: any) {
      const { resolve = defaultFieldResolver } = field;

      field.resolve = async function (
        source: any,
        args: any,
        context: any,
        info: any,
      ) {
        const span = tracer.startSpan('field-level-authz', {
          attributes: {
            'graphql.field.name': info.fieldName,
            'graphql.parent.type': info.parentType.name,
          },
        });

        try {
          if (!context.user) {
            span.setStatus({ code: 2, message: 'No user in context' });
            span.end();
            throw new AuthenticationError('Authentication required');
          }

          const policyInput: OPAPolicyInput = {
            user: context.user,
            resource: {
              type: info.parentType.name.toLowerCase(),
              tenant: context.user.tenant,
              // Add field-specific resource attributes
              ...(source && source.id && { id: source.id }),
              ...(source && source.purpose && { purpose: source.purpose }),
              ...(source && source.region && { region: source.region }),
              ...(source &&
                source.pii_flags && { pii_flags: source.pii_flags }),
            },
            operation_type: 'query', // TODO: Detect mutation vs query
            field_name: info.fieldName,
          };

          const allowed = await opaClient.evaluate(
            'intelgraph.abac.graphql_allowed',
            policyInput,
          );

          if (!allowed) {
            span.setStatus({ code: 2, message: 'Field access denied' });
            span.end();
            throw new ForbiddenError(
              `Access denied to field ${info.fieldName}`,
            );
          }

          span.setAttributes({ 'authz.field.allowed': true });
          span.end();

          return resolve.call(this, source, args, context, info);
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          span.end();
          throw error;
        }
      };
    }
  };
}

/**
 * Residency enforcement middleware for US-only data locality
 */
export function residencyEnforcementMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = (req as any).user as User;

  if (user && user.residency !== 'US') {
    logger.warn('Non-US user attempted access', {
      user_id: user.id,
      user_residency: user.residency,
      ip: req.ip,
    });

    throw new ForbiddenError('Access restricted to US residents only');
  }

  next();
}

// Default field resolver placeholder
const defaultFieldResolver = (
  source: any,
  args: any,
  context: any,
  info: any,
) => {
  return source[info.fieldName];
};
