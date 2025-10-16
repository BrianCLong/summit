/**
 * @fileoverview WebAuthn Express Middleware
 * Express middleware for WebAuthn authentication with automatic
 * step-up enforcement, session management, and risk assessment.
 */

import { Request, Response, NextFunction } from 'express';
import { WebAuthnManager, StepUpReason, RiskLevel } from './WebAuthnManager.js';

/**
 * Extended request interface with WebAuthn context
 */
export interface WebAuthnRequest extends Request {
  webauthn?: {
    sessionId?: string;
    userId?: string;
    isElevated: boolean;
    elevationLevel: string;
    riskScore: number;
    requiresStepUp?: boolean;
    stepUpReason?: StepUpReason;
  };
  requireStepUp?: (operation: {
    type: string;
    riskLevel: RiskLevel;
    resourceId?: string;
  }) => Promise<boolean>;
}

/**
 * WebAuthn middleware configuration
 */
export interface WebAuthnMiddlewareConfig {
  sessionCookieName: string;
  enforceStepUp: boolean;
  defaultRiskLevel: RiskLevel;
  skipPaths: string[];
  stepUpPaths: Array<{
    path: string | RegExp;
    riskLevel: RiskLevel;
    operation: string;
  }>;
  maxRetries: number;
  rateLimit: {
    windowMs: number;
    maxAttempts: number;
  };
}

/**
 * WebAuthn middleware for Express applications
 */
export class WebAuthnMiddleware {
  private attemptCounts: Map<string, { count: number; resetAt: Date }> =
    new Map();

  constructor(
    private webauthnManager: WebAuthnManager,
    private config: WebAuthnMiddlewareConfig,
  ) {
    this.startCleanupTask();
  }

  /**
   * Main WebAuthn middleware
   */
  middleware = async (
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Skip middleware for excluded paths
      if (this.shouldSkipPath(req.path)) {
        return next();
      }

      // Check rate limiting
      if (!this.checkRateLimit(req)) {
        return res.status(429).json({
          error: 'Too many authentication attempts',
          code: 'RATE_LIMITED',
        });
      }

      // Extract session information
      const sessionId = this.extractSessionId(req);

      if (!sessionId) {
        return this.handleMissingSession(req, res, next);
      }

      // Get session details
      const session = this.webauthnManager.getSession(sessionId);

      if (!session) {
        return this.handleInvalidSession(req, res, next);
      }

      // Attach WebAuthn context to request
      req.webauthn = {
        sessionId: session.sessionId,
        userId: session.userId,
        isElevated: session.isElevated,
        elevationLevel: session.elevationLevel,
        riskScore: session.riskScore,
      };

      // Add step-up helper function to request
      req.requireStepUp = async (operation) => {
        return this.requireStepUp(req, operation);
      };

      // Check if current path requires step-up
      const stepUpRequired = await this.checkPathStepUpRequirement(req);

      if (stepUpRequired.required && !stepUpRequired.satisfied) {
        req.webauthn.requiresStepUp = true;
        req.webauthn.stepUpReason = stepUpRequired.reason;

        if (this.config.enforceStepUp) {
          return this.handleStepUpRequired(req, res, stepUpRequired);
        }
      }

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('WebAuthn middleware error:', error);
      res.status(500).json({
        error: 'Internal authentication error',
        code: 'WEBAUTHN_ERROR',
      });
    }
  };

  /**
   * Require authentication middleware (must have valid session)
   */
  requireAuth = (
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.webauthn?.sessionId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    next();
  };

  /**
   * Require elevation middleware (must have elevated session)
   */
  requireElevation = (level: 'high' | 'critical' = 'high') => {
    return async (
      req: WebAuthnRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (!req.webauthn?.isElevated) {
        return this.handleElevationRequired(req, res, level);
      }

      // Check if elevation level is sufficient
      const currentLevel = req.webauthn.elevationLevel;
      const sufficient = this.isElevationSufficient(currentLevel, level);

      if (!sufficient) {
        return this.handleElevationRequired(req, res, level);
      }

      next();
    };
  };

  /**
   * Dynamic step-up middleware based on risk assessment
   */
  requireStepUpIfRisky = (baseRiskLevel: RiskLevel = 'medium') => {
    return async (
      req: WebAuthnRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (!req.webauthn) {
        return res.status(401).json({
          error: 'Authentication context missing',
          code: 'AUTH_CONTEXT_MISSING',
        });
      }

      // Assess if step-up is needed based on risk
      const riskAssessment = await this.assessRequestRisk(req, baseRiskLevel);

      if (riskAssessment.requiresStepUp && !req.webauthn.isElevated) {
        req.webauthn.requiresStepUp = true;
        req.webauthn.stepUpReason = riskAssessment.reason;

        return this.handleStepUpRequired(req, res, {
          required: true,
          reason: riskAssessment.reason,
          satisfied: false,
          operation: riskAssessment.operation,
          riskLevel: riskAssessment.riskLevel,
        });
      }

      next();
    };
  };

  /**
   * Middleware for high-value operations
   */
  requireHighValueAuth = async (
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const operation = {
      type: 'high_value_operation',
      riskLevel: 'high' as RiskLevel,
      resourceId: req.params.id,
    };

    const stepUpNeeded = await this.requireStepUp(req, operation);

    if (stepUpNeeded) {
      req.webauthn = req.webauthn || ({} as any);
      req.webauthn.requiresStepUp = true;
      req.webauthn.stepUpReason = 'high_value_operation';

      return this.handleStepUpRequired(req, res, {
        required: true,
        reason: 'high_value_operation',
        satisfied: false,
        operation: operation.type,
        riskLevel: operation.riskLevel,
      });
    }

    next();
  };

  /**
   * Middleware for admin operations
   */
  requireAdminAuth = async (
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const operation = {
      type: 'admin_action',
      riskLevel: 'critical' as RiskLevel,
      resourceId: req.body.resourceId || req.params.id,
    };

    const stepUpNeeded = await this.requireStepUp(req, operation);

    if (stepUpNeeded) {
      req.webauthn = req.webauthn || ({} as any);
      req.webauthn.requiresStepUp = true;
      req.webauthn.stepUpReason = 'admin_action';

      return this.handleStepUpRequired(req, res, {
        required: true,
        reason: 'admin_action',
        satisfied: false,
        operation: operation.type,
        riskLevel: operation.riskLevel,
      });
    }

    next();
  };

  /**
   * Check if step-up is required for operation
   */
  private async requireStepUp(
    req: WebAuthnRequest,
    operation: {
      type: string;
      riskLevel: RiskLevel;
      resourceId?: string;
    },
  ): Promise<boolean> {
    if (!req.webauthn?.sessionId) {
      return true; // No session = requires authentication
    }

    const sessionId = req.webauthn.sessionId;
    const result = await this.webauthnManager.requiresStepUp(
      sessionId,
      operation,
    );

    return result.required;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: Request): string | null {
    // Try cookie first
    const cookieSessionId = req.cookies[this.config.sessionCookieName];
    if (cookieSessionId) {
      return cookieSessionId;
    }

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try custom header
    const customHeader = req.headers['x-session-id'];
    if (typeof customHeader === 'string') {
      return customHeader;
    }

    return null;
  }

  /**
   * Check if path should skip WebAuthn middleware
   */
  private shouldSkipPath(path: string): boolean {
    return this.config.skipPaths.some((skipPath) => {
      if (typeof skipPath === 'string') {
        return path === skipPath;
      }
      return skipPath.test(path);
    });
  }

  /**
   * Check rate limiting for authentication attempts
   */
  private checkRateLimit(req: Request): boolean {
    const identifier = req.ip || 'unknown';
    const now = new Date();
    const windowMs = this.config.rateLimit.windowMs;

    const entry = this.attemptCounts.get(identifier);

    if (!entry || entry.resetAt <= now) {
      // Reset or create new entry
      this.attemptCounts.set(identifier, {
        count: 1,
        resetAt: new Date(now.getTime() + windowMs),
      });
      return true;
    }

    if (entry.count >= this.config.rateLimit.maxAttempts) {
      return false; // Rate limited
    }

    entry.count++;
    return true;
  }

  /**
   * Check if current path requires step-up
   */
  private async checkPathStepUpRequirement(req: WebAuthnRequest): Promise<{
    required: boolean;
    satisfied: boolean;
    reason?: StepUpReason;
    operation?: string;
    riskLevel?: RiskLevel;
  }> {
    const pathConfig = this.config.stepUpPaths.find((config) => {
      if (typeof config.path === 'string') {
        return req.path === config.path;
      }
      return config.path.test(req.path);
    });

    if (!pathConfig) {
      return { required: false, satisfied: true };
    }

    // Path requires step-up, check if session is elevated
    const isElevated = req.webauthn?.isElevated || false;
    const elevationLevel = req.webauthn?.elevationLevel || 'standard';

    const sufficient =
      isElevated &&
      this.isElevationSufficient(elevationLevel, pathConfig.riskLevel);

    return {
      required: true,
      satisfied: sufficient,
      reason: this.mapOperationToReason(pathConfig.operation),
      operation: pathConfig.operation,
      riskLevel: pathConfig.riskLevel,
    };
  }

  /**
   * Assess request risk level
   */
  private async assessRequestRisk(
    req: WebAuthnRequest,
    baseRiskLevel: RiskLevel,
  ): Promise<{
    requiresStepUp: boolean;
    reason: StepUpReason;
    operation: string;
    riskLevel: RiskLevel;
  }> {
    let riskLevel = baseRiskLevel;
    let reason: StepUpReason = 'high_value_operation';

    // Increase risk based on request characteristics

    // Check for sensitive parameters
    if (this.hasSensitiveParameters(req)) {
      riskLevel = this.escalateRisk(riskLevel);
      reason = 'sensitive_data_access';
    }

    // Check for bulk operations
    if (this.isBulkOperation(req)) {
      riskLevel = this.escalateRisk(riskLevel);
    }

    // Check for destructive operations
    if (this.isDestructiveOperation(req)) {
      riskLevel = 'critical';
      reason = 'high_value_operation';
    }

    // Check user's risk score
    const userRiskScore = req.webauthn?.riskScore || 0;
    if (userRiskScore > 70) {
      riskLevel = this.escalateRisk(riskLevel);
      reason = 'unusual_activity';
    }

    const requiresStepUp =
      this.riskLevelRequiresStepUp(riskLevel) && !req.webauthn?.isElevated;

    return {
      requiresStepUp,
      reason,
      operation: req.method + ' ' + req.path,
      riskLevel,
    };
  }

  /**
   * Handle missing session
   */
  private handleMissingSession(
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): void {
    res.status(401).json({
      error: 'No authentication session found',
      code: 'NO_SESSION',
      webauthn: {
        action: 'authenticate',
        message: 'Please authenticate with WebAuthn',
      },
    });
  }

  /**
   * Handle invalid session
   */
  private handleInvalidSession(
    req: WebAuthnRequest,
    res: Response,
    next: NextFunction,
  ): void {
    res.status(401).json({
      error: 'Invalid or expired session',
      code: 'INVALID_SESSION',
      webauthn: {
        action: 're-authenticate',
        message: 'Session expired, please re-authenticate',
      },
    });
  }

  /**
   * Handle step-up authentication required
   */
  private handleStepUpRequired(
    req: WebAuthnRequest,
    res: Response,
    requirement: {
      required: boolean;
      reason: StepUpReason;
      operation: string;
      riskLevel: RiskLevel;
    },
  ): void {
    res.status(403).json({
      error: 'Step-up authentication required',
      code: 'STEP_UP_REQUIRED',
      webauthn: {
        action: 'step-up',
        reason: requirement.reason,
        operation: requirement.operation,
        riskLevel: requirement.riskLevel,
        message: this.getStepUpMessage(requirement.reason),
        challengeEndpoint: '/api/auth/webauthn/step-up/challenge',
        verifyEndpoint: '/api/auth/webauthn/step-up/verify',
      },
    });
  }

  /**
   * Handle elevation required
   */
  private handleElevationRequired(
    req: WebAuthnRequest,
    res: Response,
    requiredLevel: string,
  ): void {
    res.status(403).json({
      error: 'Higher authentication level required',
      code: 'ELEVATION_REQUIRED',
      webauthn: {
        action: 'elevate',
        currentLevel: req.webauthn?.elevationLevel || 'standard',
        requiredLevel,
        message: `This operation requires ${requiredLevel} level authentication`,
        challengeEndpoint: '/api/auth/webauthn/step-up/challenge',
        verifyEndpoint: '/api/auth/webauthn/step-up/verify',
      },
    });
  }

  /**
   * Helper methods
   */

  private isElevationSufficient(
    currentLevel: string,
    requiredRisk: RiskLevel,
  ): boolean {
    const levelMapping = {
      standard: 1,
      high: 2,
      critical: 3,
    };

    const riskMapping = {
      low: 1,
      medium: 1,
      high: 2,
      critical: 3,
    };

    return (
      levelMapping[currentLevel as keyof typeof levelMapping] >=
      riskMapping[requiredRisk]
    );
  }

  private mapOperationToReason(operation: string): StepUpReason {
    if (operation.includes('admin')) return 'admin_action';
    if (operation.includes('sensitive')) return 'sensitive_data_access';
    if (operation.includes('delete') || operation.includes('destroy'))
      return 'high_value_operation';
    return 'high_value_operation';
  }

  private hasSensitiveParameters(req: Request): boolean {
    const sensitiveFields = [
      'password',
      'token',
      'key',
      'secret',
      'private',
      'ssn',
      'credit_card',
      'bank_account',
      'personal_data',
    ];

    const allParams = { ...req.body, ...req.query, ...req.params };

    return Object.keys(allParams).some((key) =>
      sensitiveFields.some((field) => key.toLowerCase().includes(field)),
    );
  }

  private isBulkOperation(req: Request): boolean {
    // Check for bulk operation indicators
    if (Array.isArray(req.body)) return true;
    if (req.body?.items && Array.isArray(req.body.items)) return true;
    if (req.body?.bulk === true) return true;
    if (req.path.includes('bulk') || req.path.includes('batch')) return true;

    return false;
  }

  private isDestructiveOperation(req: Request): boolean {
    const destructivePaths = ['/delete', '/destroy', '/purge', '/drop'];
    const destructiveMethods = ['DELETE'];
    const destructiveActions = ['delete', 'destroy', 'purge', 'drop', 'remove'];

    // Check method
    if (destructiveMethods.includes(req.method)) return true;

    // Check path
    if (destructivePaths.some((path) => req.path.includes(path))) return true;

    // Check body action
    if (
      req.body?.action &&
      destructiveActions.includes(req.body.action.toLowerCase())
    ) {
      return true;
    }

    return false;
  }

  private escalateRisk(currentRisk: RiskLevel): RiskLevel {
    switch (currentRisk) {
      case 'low':
        return 'medium';
      case 'medium':
        return 'high';
      case 'high':
        return 'critical';
      case 'critical':
        return 'critical';
    }
  }

  private riskLevelRequiresStepUp(riskLevel: RiskLevel): boolean {
    return riskLevel === 'high' || riskLevel === 'critical';
  }

  private getStepUpMessage(reason: StepUpReason): string {
    const messages = {
      high_value_operation:
        'This high-value operation requires additional authentication',
      sensitive_data_access:
        'Accessing sensitive data requires step-up authentication',
      admin_action: 'Administrative actions require elevated authentication',
      unusual_activity:
        'Unusual activity detected, additional verification required',
      location_change: 'New location detected, please verify your identity',
      device_change: 'New device detected, additional authentication required',
      time_based: 'Session elevation expired, please re-authenticate',
      manual_request: 'Manual step-up authentication requested',
    };

    return messages[reason] || 'Additional authentication required';
  }

  /**
   * Start cleanup task for rate limiting data
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.attemptCounts.entries()) {
        if (entry.resetAt <= now) {
          this.attemptCounts.delete(key);
        }
      }
    }, 60 * 1000); // Clean up every minute
  }
}

/**
 * Factory function to create WebAuthn middleware with common configurations
 */
export function createWebAuthnMiddleware(
  webauthnManager: WebAuthnManager,
  options: Partial<WebAuthnMiddlewareConfig> = {},
): WebAuthnMiddleware {
  const config: WebAuthnMiddlewareConfig = {
    sessionCookieName: 'webauthn_session',
    enforceStepUp: true,
    defaultRiskLevel: 'medium',
    skipPaths: [
      '/api/auth/webauthn/register',
      '/api/auth/webauthn/challenge',
      '/api/auth/webauthn/verify',
      '/api/health',
      '/api/status',
    ],
    stepUpPaths: [
      {
        path: /^\/api\/admin/,
        riskLevel: 'critical',
        operation: 'admin_action',
      },
      {
        path: /^\/api\/users\/[^/]+\/sensitive/,
        riskLevel: 'high',
        operation: 'sensitive_data_access',
      },
      {
        path: '/api/financial/transfer',
        riskLevel: 'critical',
        operation: 'high_value_operation',
      },
    ],
    maxRetries: 5,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 10,
    },
    ...options,
  };

  return new WebAuthnMiddleware(webauthnManager, config);
}
