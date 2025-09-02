/**
 * IntelGraph GA-Core Authority Binding Middleware
 * Committee Requirement: Foster & Starkey dissent implementation
 *
 * Implements runtime-blocking authority/license enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface AuthorityBinding {
  type: 'WARRANT' | 'SUBPOENA' | 'COURT_ORDER' | 'ADMIN_AUTH' | 'LICENSE' | 'TOS';
  jurisdiction: string;
  reference: string;
  expiry_date: string;
  scope: string[];
}

interface User {
  id: string;
  clearance_level: number;
  license_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
  tos_accepted: boolean;
  authority_bindings: AuthorityBinding[];
}

interface PolicyDecision {
  allow: boolean;
  reasons: string[];
  required_authority?: string[];
  audit_trail: any[];
}

export class AuthorityGuard {
  private static instance: AuthorityGuard;

  public static getInstance(): AuthorityGuard {
    if (!AuthorityGuard.instance) {
      AuthorityGuard.instance = new AuthorityGuard();
    }
    return AuthorityGuard.instance;
  }

  // Foster dissent: Runtime-blocking license enforcement
  private validateLicense(user: User, operation: string): boolean {
    if (user.license_status !== 'ACTIVE') {
      logger.error({
        message: 'License validation failed - Foster dissent protection',
        user_id: user.id,
        license_status: user.license_status,
        operation,
      });
      return false;
    }

    if (!user.tos_accepted) {
      logger.error({
        message: 'Terms of Service not accepted - Foster dissent protection',
        user_id: user.id,
        operation,
      });
      return false;
    }

    return true;
  }

  // Starkey dissent: Authority binding validation
  private validateAuthorityBinding(
    user: User,
    operation: string,
    scope: string[],
  ): { valid: boolean; reason?: string } {
    const requiredAuthorities = this.getRequiredAuthorities(operation);

    if (requiredAuthorities.length === 0) {
      return { valid: true };
    }

    for (const requiredAuth of requiredAuthorities) {
      const binding = user.authority_bindings.find(
        (auth) => auth.type === requiredAuth && this.isAuthorityValid(auth, scope),
      );

      if (!binding) {
        return {
          valid: false,
          reason: `Missing required authority: ${requiredAuth}`,
        };
      }
    }

    return { valid: true };
  }

  private getRequiredAuthorities(operation: string): AuthorityBinding['type'][] {
    const authMap: Record<string, AuthorityBinding['type'][]> = {
      classified_query: ['WARRANT', 'COURT_ORDER'],
      export_data: ['SUBPOENA', 'COURT_ORDER', 'ADMIN_AUTH'],
      graph_xai_analysis: ['ADMIN_AUTH'],
      temporal_analysis: ['LICENSE'],
      cross_tenant_access: ['WARRANT', 'COURT_ORDER'],
    };

    return authMap[operation] || ['LICENSE'];
  }

  private isAuthorityValid(authority: AuthorityBinding, scope: string[]): boolean {
    const expiryDate = new Date(authority.expiry_date);
    const now = new Date();

    if (expiryDate <= now) {
      logger.warn({
        message: 'Expired authority binding detected',
        authority_type: authority.type,
        expiry_date: authority.expiry_date,
      });
      return false;
    }

    // Check if authority scope covers requested operation scope
    const hasScope = scope.every(
      (requestedScope) => authority.scope.includes(requestedScope) || authority.scope.includes('*'),
    );

    if (!hasScope) {
      logger.warn({
        message: 'Authority scope insufficient',
        authority_scope: authority.scope,
        requested_scope: scope,
      });
      return false;
    }

    return true;
  }

  // Committee requirement: Comprehensive policy evaluation
  public evaluatePolicy(
    user: User,
    operation: string,
    operationScope: string[],
    exportManifest?: any,
  ): PolicyDecision {
    const decision: PolicyDecision = {
      allow: false,
      reasons: [],
      audit_trail: [],
    };

    // Foster dissent: License enforcement
    const licenseValid = this.validateLicense(user, operation);
    if (!licenseValid) {
      decision.reasons.push('License validation failed - Foster dissent protection active');
    }

    // Starkey dissent: Authority binding validation
    const authorityCheck = this.validateAuthorityBinding(user, operation, operationScope);
    if (!authorityCheck.valid) {
      decision.reasons.push(authorityCheck.reason || 'Authority validation failed');
      decision.required_authority = this.getRequiredAuthorities(operation);
    }

    // Starkey dissent: Export manifest validation
    if (operation === 'export_data') {
      if (!exportManifest || !exportManifest.hash) {
        decision.reasons.push('Missing export manifest - Starkey dissent protection active');
      } else if (!exportManifest.immutable_disclosure_bundle) {
        decision.reasons.push('Missing immutable disclosure bundle - Starkey dissent protection');
      }
    }

    // Clearance level check
    const requiredClearance = this.getRequiredClearance(operation);
    if (user.clearance_level < requiredClearance) {
      decision.reasons.push(
        `Insufficient clearance level: ${user.clearance_level} < ${requiredClearance}`,
      );
    }

    decision.allow = decision.reasons.length === 0;
    decision.audit_trail.push({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      operation,
      decision: decision.allow ? 'ALLOW' : 'DENY',
      reasons: decision.reasons,
    });

    return decision;
  }

  private getRequiredClearance(operation: string): number {
    const clearanceMap: Record<string, number> = {
      classified_query: 5,
      export_data: 4,
      graph_xai_analysis: 3,
      temporal_analysis: 2,
      basic_query: 1,
    };

    return clearanceMap[operation] || 1;
  }
}

// Express middleware for authority checking
export const requireAuthority = (operation: string, scope: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const guard = AuthorityGuard.getInstance();
    const user = req.user as User; // Assumes user attached by auth middleware

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const decision = guard.evaluatePolicy(user, operation, scope, req.body.export_manifest);

    if (!decision.allow) {
      logger.warn({
        message: 'Authority check failed - Committee dissent protection active',
        user_id: user.id,
        operation,
        reasons: decision.reasons,
        required_authority: decision.required_authority,
      });

      return res.status(403).json({
        error: 'Insufficient authority',
        reasons: decision.reasons,
        required_authority: decision.required_authority,
        code: 'AUTHORITY_DENIED',
      });
    }

    // Attach decision to request for audit trail
    req.authority_decision = decision;

    logger.info({
      message: 'Authority check passed',
      user_id: user.id,
      operation,
      clearance_level: user.clearance_level,
    });

    next();
  };
};

// Committee requirement: Reason for access context propagation
export const requireReasonForAccess = (req: Request, res: Response, next: NextFunction) => {
  const reasonForAccess = req.headers['x-reason-for-access'] as string;

  if (!reasonForAccess || reasonForAccess.length < 10) {
    return res.status(400).json({
      error: 'Reason for access required',
      message: 'Committee requirement: All access must include detailed justification',
      code: 'REASON_REQUIRED',
    });
  }

  // Quality scoring for reason (Committee spec)
  const qualityScore = Math.min(reasonForAccess.length / 100, 1.0);

  req.reason_for_access = {
    reason: reasonForAccess,
    quality_score: qualityScore,
    timestamp: new Date().toISOString(),
  };

  logger.info({
    message: 'Reason for access recorded',
    reason: reasonForAccess.substring(0, 100),
    quality_score: qualityScore,
    user_id: req.user?.id,
  });

  next();
};

export default {
  AuthorityGuard,
  requireAuthority,
  requireReasonForAccess,
};
