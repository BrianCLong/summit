/**
 * Express/GraphQL Middleware for Authority Enforcement
 *
 * Integrates the authority compiler into the request pipeline.
 */

import type { Request, Response, NextFunction } from 'express';
import { PolicyEvaluator, EvaluationContext } from './evaluator';
import { Operation, ClassificationLevel } from './schema/policy.schema';

export interface AuthorityMiddlewareOptions {
  /** Policy evaluator instance */
  evaluator: PolicyEvaluator;
  /** Function to extract user from request */
  extractUser: (req: Request) => EvaluationContext['user'] | null;
  /** Function to extract resource from request */
  extractResource?: (req: Request) => EvaluationContext['resource'];
  /** Default operation if not specified */
  defaultOperation?: Operation;
  /** Skip evaluation for certain paths */
  skipPaths?: string[];
  /** Custom error handler */
  onDeny?: (req: Request, res: Response, reason: string) => void;
}

/**
 * Create Express middleware for authority enforcement
 */
export function createAuthorityMiddleware(options: AuthorityMiddlewareOptions) {
  const {
    evaluator,
    extractUser,
    extractResource,
    defaultOperation = 'READ',
    skipPaths = ['/health', '/metrics'],
    onDeny,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip certain paths
    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Extract user
    const user = extractUser(req);
    if (!user) {
      if (onDeny) {
        return onDeny(req, res, 'User not authenticated');
      }
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    // Determine operation from HTTP method
    let operation: Operation = defaultOperation;
    switch (req.method) {
      case 'GET':
        operation = 'READ';
        break;
      case 'POST':
        operation = 'CREATE';
        break;
      case 'PUT':
      case 'PATCH':
        operation = 'UPDATE';
        break;
      case 'DELETE':
        operation = 'DELETE';
        break;
    }

    // Extract resource context
    const resource = extractResource ? extractResource(req) : {};

    // Build evaluation context
    const context: EvaluationContext = {
      user,
      operation,
      resource,
      request: {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        justification: req.get('X-Access-Justification'),
        mfaVerified: req.get('X-MFA-Verified') === 'true',
      },
    };

    // Evaluate policy
    const decision = await evaluator.evaluate(context);

    // Attach decision to request for downstream use
    (req as any).policyDecision = decision;

    if (!decision.allowed) {
      if (onDeny) {
        return onDeny(req, res, decision.reason);
      }
      return res.status(403).json({
        error: 'Forbidden',
        message: decision.reason,
        auditId: decision.auditId,
      });
    }

    // Handle two-person control requirement
    if (decision.requiresTwoPersonControl) {
      // Check if approval header is present
      const approvalId = req.get('X-Two-Person-Approval');
      if (!approvalId) {
        return res.status(403).json({
          error: 'Two-Person Control Required',
          message: 'This operation requires two-person approval',
          twoPersonControlId: decision.twoPersonControlId,
          auditId: decision.auditId,
        });
      }
      // In production, validate the approval ID against the approval service
    }

    // Handle pending conditions
    if (decision.conditions && decision.conditions.length > 0) {
      // Check if conditions are satisfied
      const conditionsSatisfied = decision.conditions.every((condition) => {
        if (condition === 'Justification required') {
          return !!context.request.justification;
        }
        return true;
      });

      if (!conditionsSatisfied) {
        return res.status(403).json({
          error: 'Conditions Not Met',
          message: `Required conditions: ${decision.conditions.join(', ')}`,
          conditions: decision.conditions,
          auditId: decision.auditId,
        });
      }
    }

    next();
  };
}

/**
 * GraphQL directive for authority enforcement
 */
export function createAuthorityDirective(evaluator: PolicyEvaluator) {
  return {
    authorityDirectiveTypeDefs: `
      directive @authority(
        operation: String!
        entityType: String
        classification: String
      ) on FIELD_DEFINITION
    `,

    authorityDirectiveTransformer: (schema: any) => {
      // This would be implemented using @graphql-tools/utils mapSchema
      // to wrap resolvers with authority checks
      return schema;
    },
  };
}

/**
 * Helper to extract classification from entity props
 */
export function extractClassification(props: Record<string, any>): ClassificationLevel | undefined {
  const classification = props?.classification || props?.securityClassification;
  if (classification && ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'].includes(classification)) {
    return classification as ClassificationLevel;
  }
  return undefined;
}

/**
 * Helper to extract compartments from entity props
 */
export function extractCompartments(props: Record<string, any>): string[] {
  const compartments = props?.compartments || props?.accessCompartments;
  if (Array.isArray(compartments)) {
    return compartments.filter((c) => typeof c === 'string');
  }
  return [];
}
