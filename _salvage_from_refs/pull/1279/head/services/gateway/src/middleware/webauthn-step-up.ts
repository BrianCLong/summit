/**
 * WebAuthn Step-Up Middleware
 *
 * Express middleware that enforces WebAuthn step-up authentication
 * for high-risk operations based on real-time risk assessment.
 */

import { Request, Response, NextFunction } from 'express';
import { WebAuthnEnforcer } from '../auth/webauthn-enforcer';
import { logger } from '../utils/logger';
import { performance } from 'perf_hooks';

interface StepUpOptions {
  riskThreshold: number;
  enabledOperations: string[];
  exemptRoles: string[];
  exemptOperations: string[];
  maxSessionDuration: number;
  enableDeviceFingerprinting: boolean;
  requireUserVerification: boolean;
}

interface StepUpResult {
  required: boolean;
  sessionId?: string;
  authLevel: number;
  riskScore: number;
  reason?: string;
}

export class WebAuthnStepUpMiddleware {
  private webauthnEnforcer: WebAuthnEnforcer;
  private options: StepUpOptions;

  constructor(webauthnEnforcer: WebAuthnEnforcer, options: Partial<StepUpOptions> = {}) {
    this.webauthnEnforcer = webauthnEnforcer;
    this.options = {
      riskThreshold: 40,
      enabledOperations: ['*'], // All operations by default
      exemptRoles: ['system', 'service'],
      exemptOperations: ['health', 'metrics', 'status'],
      maxSessionDuration: 300000, // 5 minutes
      enableDeviceFingerprinting: true,
      requireUserVerification: true,
      ...options
    };
  }

  // Main middleware function
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        // Skip if user is not authenticated
        if (!req.user) {
          return next();
        }

        // Check if step-up is required for this request
        const stepUpResult = await this.checkStepUpRequired(req);

        if (!stepUpResult.required) {
          // Add step-up context to request
          req.stepUpContext = {
            required: false,
            authLevel: stepUpResult.authLevel,
            riskScore: stepUpResult.riskScore
          };
          return next();
        }

        // Check if there's an existing valid step-up session
        const existingSessionId = this.extractSessionId(req);
        if (existingSessionId) {
          const isValid = await this.webauthnEnforcer.isStepUpSatisfied(existingSessionId);
          if (isValid) {
            req.stepUpContext = {
              required: true,
              satisfied: true,
              sessionId: existingSessionId,
              authLevel: stepUpResult.authLevel,
              riskScore: stepUpResult.riskScore
            };
            return next();
          }
        }

        // Step-up authentication required
        logger.info('Step-up authentication required', {
          userId: req.user.id,
          operation: this.extractOperation(req),
          riskScore: stepUpResult.riskScore,
          authLevel: stepUpResult.authLevel,
          sessionId: stepUpResult.sessionId
        });

        return this.handleStepUpRequired(req, res, stepUpResult);

      } catch (error) {
        logger.error('WebAuthn step-up middleware error', {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        });

        // Fail securely - require step-up on error
        return this.handleStepUpRequired(req, res, {
          required: true,
          authLevel: 1,
          riskScore: 100,
          reason: 'Error in risk assessment'
        });
      } finally {
        const duration = performance.now() - startTime;
        logger.debug('WebAuthn step-up middleware completed', {
          path: req.path,
          userId: req.user?.id,
          duration: `${duration.toFixed(2)}ms`
        });
      }
    };
  }

  // Check if step-up authentication is required
  private async checkStepUpRequired(req: Request): Promise<StepUpResult> {
    const user = req.user!;
    const operation = this.extractOperation(req);

    // Check exemptions
    if (this.isExempt(user, operation)) {
      return {
        required: false,
        authLevel: 1,
        riskScore: 0,
        reason: 'Exempt from step-up'
      };
    }

    // Check if operation requires step-up
    if (!this.isStepUpOperation(operation)) {
      return {
        required: false,
        authLevel: 1,
        riskScore: 0,
        reason: 'Operation does not require step-up'
      };
    }

    // Perform risk assessment
    const context = this.extractContext(req);
    const riskAssessment = await this.webauthnEnforcer.assessRisk({
      userId: user.id,
      tenantId: user.tenantId || req.headers['x-tenant-id'] as string,
      operation,
      context
    });

    // Determine if step-up is required based on risk
    const required = riskAssessment.recommendation === 'step_up' ||
                    riskAssessment.score >= this.options.riskThreshold;

    let sessionId: string | undefined;

    if (required) {
      // Create step-up session
      const session = await this.webauthnEnforcer.createStepUpSession({
        userId: user.id,
        tenantId: user.tenantId || req.headers['x-tenant-id'] as string,
        operation,
        riskAssessment,
        context
      });
      sessionId = session.id;
    }

    return {
      required,
      sessionId,
      authLevel: riskAssessment.requiredAuthLevel,
      riskScore: riskAssessment.score,
      reason: required ? 'Risk assessment requires step-up' : 'Risk assessment allows access'
    };
  }

  // Check if user/operation is exempt from step-up
  private isExempt(user: any, operation: string): boolean {
    // Check role exemptions
    if (user.roles && this.options.exemptRoles.some(role => user.roles.includes(role))) {
      return true;
    }

    // Check operation exemptions
    if (this.options.exemptOperations.includes(operation)) {
      return true;
    }

    // Check system user
    if (user.type === 'system' || user.type === 'service') {
      return true;
    }

    return false;
  }

  // Check if operation requires step-up
  private isStepUpOperation(operation: string): boolean {
    if (this.options.enabledOperations.includes('*')) {
      return true;
    }

    return this.options.enabledOperations.some(enabledOp => {
      if (enabledOp.includes('*')) {
        const pattern = enabledOp.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(operation);
      }
      return enabledOp === operation;
    });
  }

  // Extract operation identifier from request
  private extractOperation(req: Request): string {
    // GraphQL operations
    if (req.path === '/graphql' && req.body?.query) {
      const query = req.body.query;
      const operationMatch = query.match(/(query|mutation|subscription)\s+(\w+)/i);
      if (operationMatch) {
        return `${operationMatch[1]}.${operationMatch[2]}`;
      }
      return 'graphql.anonymous';
    }

    // REST operations
    const pathSegments = req.path.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      return `${req.method.toLowerCase()}.${pathSegments.join('.')}`;
    }

    return `${req.method.toLowerCase()}.${req.path}`;
  }

  // Extract request context for risk assessment
  private extractContext(req: Request): Record<string, any> {
    const context: Record<string, any> = {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    };

    // Add geolocation data if available
    if (req.headers['cf-ipcountry']) {
      context.country = req.headers['cf-ipcountry'];
    }

    // Add device fingerprinting if enabled
    if (this.options.enableDeviceFingerprinting) {
      context.deviceFingerprint = this.generateDeviceFingerprint(req);
    }

    // Add security headers
    context.securityHeaders = {
      xForwardedFor: req.headers['x-forwarded-for'],
      xRealIp: req.headers['x-real-ip'],
      xForwardedProto: req.headers['x-forwarded-proto']
    };

    return context;
  }

  // Generate device fingerprint
  private generateDeviceFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.headers['accept'] || '',
      req.ip || ''
    ];

    // Simple hash of fingerprinting components
    const fingerprint = components.join('|');
    return Buffer.from(fingerprint).toString('base64').substring(0, 32);
  }

  // Extract session ID from request
  private extractSessionId(req: Request): string | undefined {
    // Check header
    const headerSessionId = req.headers['x-stepup-session'] as string;
    if (headerSessionId) {
      return headerSessionId;
    }

    // Check query parameter
    const querySessionId = req.query.stepup_session as string;
    if (querySessionId) {
      return querySessionId;
    }

    // Check cookie
    const cookieSessionId = req.cookies?.stepup_session;
    if (cookieSessionId) {
      return cookieSessionId;
    }

    return undefined;
  }

  // Handle step-up authentication required
  private handleStepUpRequired(req: Request, res: Response, stepUpResult: StepUpResult): void {
    const response = {
      error: 'step_up_required',
      message: 'Additional authentication required for this operation',
      stepUp: {
        required: true,
        sessionId: stepUpResult.sessionId,
        authLevel: stepUpResult.authLevel,
        riskScore: stepUpResult.riskScore,
        reason: stepUpResult.reason
      },
      links: {
        authenticate: `/auth/webauthn/step-up/${stepUpResult.sessionId}`,
        challenge: `/auth/webauthn/step-up/${stepUpResult.sessionId}/challenge`
      },
      timestamp: new Date().toISOString()
    };

    // Set step-up session in cookie for convenience
    if (stepUpResult.sessionId) {
      res.cookie('stepup_session', stepUpResult.sessionId, {
        httpOnly: true,
        secure: req.secure,
        maxAge: this.options.maxSessionDuration,
        sameSite: 'strict'
      });
    }

    res.status(403).json(response);
  }

  // Get middleware options
  getOptions(): StepUpOptions {
    return { ...this.options };
  }

  // Update middleware options
  updateOptions(newOptions: Partial<StepUpOptions>): void {
    this.options = { ...this.options, ...newOptions };
    logger.info('WebAuthn step-up middleware options updated', newOptions);
  }
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      stepUpContext?: {
        required: boolean;
        satisfied?: boolean;
        sessionId?: string;
        authLevel: number;
        riskScore: number;
      };
    }
  }
}

// Factory function for middleware
export function createWebAuthnStepUpMiddleware(
  webauthnEnforcer: WebAuthnEnforcer,
  options?: Partial<StepUpOptions>
) {
  const middleware = new WebAuthnStepUpMiddleware(webauthnEnforcer, options);
  return middleware.middleware();
}