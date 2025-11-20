/**
 * Governance Middleware
 *
 * Extracts and validates governance context from request headers:
 * - X-Purpose: Purpose for accessing data
 * - X-Legal-Basis: Legal basis for access (comma-separated)
 * - X-Warrant-Id: Associated warrant ID
 * - X-Reason-For-Access: User-provided justification
 * - X-Sensitivity: Expected sensitivity level
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from 'apollo-server-express';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { WarrantService } from '../services/WarrantService';

export interface GovernanceContext {
  purpose: string;
  legalBasis: string[];
  warrantId?: string;
  reasonForAccess: string;
  expectedSensitivity?: string;
}

export interface GovernanceConfig {
  requirePurpose: boolean;
  requireReason: boolean;
  requireLegalBasis: boolean;
  strictMode: boolean; // If true, reject requests with invalid governance headers
  defaultPurpose?: string;
  defaultLegalBasis?: string[];
  defaultReason?: string;
}

const DEFAULT_CONFIG: GovernanceConfig = {
  requirePurpose: true,
  requireReason: true,
  requireLegalBasis: false,
  strictMode: false, // Start permissive for backward compatibility
  defaultPurpose: 'general_access',
  defaultLegalBasis: ['legitimate_interest'],
  defaultReason: 'Normal system access (auto-generated for backward compatibility)',
};

/**
 * Extract governance context from request headers
 */
export function extractGovernanceContext(req: Request): GovernanceContext {
  const purpose = (req.headers['x-purpose'] as string) || '';
  const legalBasisHeader = (req.headers['x-legal-basis'] as string) || '';
  const legalBasis = legalBasisHeader ? legalBasisHeader.split(',').map(s => s.trim()) : [];
  const warrantId = (req.headers['x-warrant-id'] as string) || undefined;
  const reasonForAccess = (req.headers['x-reason-for-access'] as string) || '';
  const expectedSensitivity = (req.headers['x-sensitivity'] as string) || undefined;

  return {
    purpose,
    legalBasis,
    warrantId,
    reasonForAccess,
    expectedSensitivity,
  };
}

/**
 * Validate governance context
 */
function validateGovernanceContext(
  context: GovernanceContext,
  config: GovernanceConfig,
  logger: Logger,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.requirePurpose && !context.purpose) {
    errors.push('Purpose header (X-Purpose) is required');
  }

  if (config.requireReason && !context.reasonForAccess) {
    errors.push('Reason for access header (X-Reason-For-Access) is required');
  }

  if (config.requireLegalBasis && context.legalBasis.length === 0) {
    errors.push('Legal basis header (X-Legal-Basis) is required');
  }

  // Validate purpose format
  if (context.purpose) {
    const validPurposes = [
      'investigation',
      'threat_intel',
      'compliance',
      'audit',
      'incident_response',
      'training',
      'analytics',
      'maintenance',
      'general_access',
    ];

    if (!validPurposes.includes(context.purpose)) {
      errors.push(`Invalid purpose: ${context.purpose}. Must be one of: ${validPurposes.join(', ')}`);
    }
  }

  // Validate legal basis format
  if (context.legalBasis.length > 0) {
    const validLegalBases = [
      'investigation',
      'court_order',
      'consent',
      'legitimate_interest',
      'legal_obligation',
      'public_interest',
    ];

    const invalidBases = context.legalBasis.filter(basis => !validLegalBases.includes(basis));
    if (invalidBases.length > 0) {
      errors.push(`Invalid legal basis: ${invalidBases.join(', ')}. Must be one of: ${validLegalBases.join(', ')}`);
    }
  }

  // Validate sensitivity format
  if (context.expectedSensitivity) {
    const validSensitivities = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    if (!validSensitivities.includes(context.expectedSensitivity)) {
      errors.push(`Invalid sensitivity: ${context.expectedSensitivity}. Must be one of: ${validSensitivities.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply defaults to governance context for backward compatibility
 */
function applyDefaults(
  context: GovernanceContext,
  config: GovernanceConfig,
): GovernanceContext {
  return {
    purpose: context.purpose || config.defaultPurpose || 'general_access',
    legalBasis: context.legalBasis.length > 0 ? context.legalBasis : (config.defaultLegalBasis || ['legitimate_interest']),
    warrantId: context.warrantId,
    reasonForAccess: context.reasonForAccess || config.defaultReason || 'Normal system access',
    expectedSensitivity: context.expectedSensitivity,
  };
}

/**
 * Validate access purpose against user permissions
 */
async function validateAccessPurpose(
  purpose: string,
  userId: string,
  tenantId: string,
  db: Pool,
  logger: Logger,
): Promise<{ valid: boolean; reason?: string; requiresWarrant?: boolean; requiresApproval?: boolean }> {
  try {
    const result = await db.query(
      `
      SELECT
        purpose_code,
        purpose_name,
        requires_warrant,
        requires_approval,
        approval_roles,
        max_data_sensitivity,
        is_active
      FROM access_purposes
      WHERE purpose_code = $1
      `,
      [purpose],
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        reason: `Unknown purpose: ${purpose}`,
      };
    }

    const purposeConfig = result.rows[0];

    if (!purposeConfig.is_active) {
      return {
        valid: false,
        reason: `Purpose ${purpose} is not active`,
      };
    }

    // TODO: Check if user has required role for this purpose
    // This would involve checking approval_roles against user's roles

    return {
      valid: true,
      requiresWarrant: purposeConfig.requires_warrant,
      requiresApproval: purposeConfig.requires_approval,
    };
  } catch (error) {
    logger.error({ error: error.message, purpose }, 'Failed to validate access purpose');
    return {
      valid: false,
      reason: 'Internal error validating purpose',
    };
  }
}

/**
 * Governance middleware factory
 */
export function createGovernanceMiddleware(
  db: Pool,
  warrantService: WarrantService,
  logger: Logger,
  config: Partial<GovernanceConfig> = {},
) {
  const finalConfig: GovernanceConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract governance context
      let governanceContext = extractGovernanceContext(req);

      // Validate governance context
      const validation = validateGovernanceContext(governanceContext, finalConfig, logger);

      if (!validation.valid) {
        if (finalConfig.strictMode) {
          // In strict mode, reject invalid requests
          logger.warn({
            errors: validation.errors,
            path: req.path,
            userId: (req as any).user?.id,
          }, 'Invalid governance context');

          throw new ForbiddenError(
            `Invalid governance context: ${validation.errors.join(', ')}`
          );
        } else {
          // In permissive mode, apply defaults and log warning
          logger.debug({
            errors: validation.errors,
            path: req.path,
            userId: (req as any).user?.id,
          }, 'Applying default governance context for backward compatibility');

          governanceContext = applyDefaults(governanceContext, finalConfig);
        }
      }

      // Validate access purpose
      if ((req as any).user && governanceContext.purpose) {
        const purposeValidation = await validateAccessPurpose(
          governanceContext.purpose,
          (req as any).user.id,
          (req as any).user.tenant,
          db,
          logger,
        );

        if (!purposeValidation.valid) {
          throw new ForbiddenError(purposeValidation.reason || 'Invalid access purpose');
        }

        // Store purpose requirements for downstream middleware
        (req as any).purposeRequirements = {
          requiresWarrant: purposeValidation.requiresWarrant,
          requiresApproval: purposeValidation.requiresApproval,
        };
      }

      // Attach governance context to request
      (req as any).governance = governanceContext;

      // Log governance context for audit
      logger.debug({
        userId: (req as any).user?.id,
        tenantId: (req as any).user?.tenant,
        path: req.path,
        governance: governanceContext,
      }, 'Governance context extracted');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Warrant validation middleware
 * Should be placed after governance middleware
 */
export function createWarrantValidationMiddleware(
  warrantService: WarrantService,
  logger: Logger,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const governance = (req as any).governance as GovernanceContext;
      const purposeRequirements = (req as any).purposeRequirements;

      // Skip if no warrant ID provided
      if (!governance?.warrantId) {
        // Check if warrant is required
        if (purposeRequirements?.requiresWarrant) {
          throw new ForbiddenError(
            `Access purpose "${governance?.purpose}" requires a warrant. Please provide X-Warrant-Id header.`
          );
        }
        return next();
      }

      // Validate warrant
      const warrant = await warrantService.getWarrant(governance.warrantId);

      if (!warrant) {
        throw new ForbiddenError(`Warrant not found: ${governance.warrantId}`);
      }

      if (warrant.status !== 'active') {
        throw new ForbiddenError(`Warrant is ${warrant.status}: ${governance.warrantId}`);
      }

      if (warrant.expiryDate && new Date() > warrant.expiryDate) {
        throw new ForbiddenError(`Warrant has expired: ${governance.warrantId}`);
      }

      // Check tenant match
      if ((req as any).user && warrant.tenantId !== (req as any).user.tenant) {
        throw new ForbiddenError('Warrant does not belong to your tenant');
      }

      // Attach warrant to request for downstream use
      (req as any).warrant = warrant;

      logger.debug({
        warrantId: warrant.id,
        warrantNumber: warrant.warrantNumber,
        userId: (req as any).user?.id,
      }, 'Warrant validated successfully');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Reason validation middleware
 * Ensures reason for access is meaningful (not just placeholder text)
 */
export function createReasonValidationMiddleware(
  logger: Logger,
  minLength: number = 10,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const governance = (req as any).governance as GovernanceContext;

    if (!governance?.reasonForAccess) {
      return next(new ForbiddenError('Reason for access is required'));
    }

    // Check if reason is too short or appears to be a placeholder
    if (governance.reasonForAccess.length < minLength) {
      return next(new ForbiddenError(`Reason for access must be at least ${minLength} characters`));
    }

    const placeholders = [
      'test',
      'testing',
      'debug',
      'temp',
      'temporary',
      'asdf',
      'placeholder',
      'todo',
    ];

    const reasonLower = governance.reasonForAccess.toLowerCase();
    if (placeholders.some(p => reasonLower.includes(p))) {
      logger.warn({
        userId: (req as any).user?.id,
        reason: governance.reasonForAccess,
      }, 'Suspicious reason for access detected');
    }

    next();
  };
}

/**
 * Feature flag middleware to enable governance gradually
 */
export function createGovernanceFeatureFlagMiddleware(
  isEnabled: () => boolean,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isEnabled()) {
      // If governance is not enabled, skip all governance checks
      (req as any).governance = {
        purpose: 'general_access',
        legalBasis: ['legitimate_interest'],
        reasonForAccess: 'Governance not enabled',
      };
    }
    next();
  };
}

/**
 * Backward compatibility middleware
 * Provides default governance context for requests without headers
 */
export function backwardCompatibilityMiddleware(
  logger: Logger,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply defaults if governance context doesn't exist
    if (!(req as any).governance) {
      (req as any).governance = {
        purpose: 'general_access',
        legalBasis: ['legitimate_interest'],
        reasonForAccess: 'Legacy request (backward compatibility)',
      };

      logger.debug({
        path: req.path,
        userId: (req as any).user?.id,
      }, 'Applied backward compatibility governance context');
    }

    next();
  };
}
