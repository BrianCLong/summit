/**
 * Data Catalog & Authority System Integration
 * Extends AuthorityGuard to enforce dataset-level access policies
 */

import { Request, Response, NextFunction } from 'express';
import { AuthorityGuard } from '../middleware/authority.js';
import { CatalogService } from './CatalogService.js';
import logger from '../utils/logger.js';

interface User {
  id: string;
  clearance_level: number;
  license_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
  tos_accepted: boolean;
  authority_bindings: AuthorityBinding[];
}

interface AuthorityBinding {
  type:
    | 'WARRANT'
    | 'SUBPOENA'
    | 'COURT_ORDER'
    | 'ADMIN_AUTH'
    | 'LICENSE'
    | 'TOS';
  jurisdiction: string;
  reference: string;
  expiry_date: string;
  scope: string[];
}

interface DatasetAccessContext {
  datasetId: string;
  accessType: 'read' | 'write' | 'export' | 'delete';
  accessMethod?: string;
  queryHash?: string;
  reasonForAccess?: string;
}

export class CatalogAuthorityGuard {
  private authorityGuard: AuthorityGuard;
  private catalogService: CatalogService;

  constructor(catalogService: CatalogService) {
    this.authorityGuard = AuthorityGuard.getInstance();
    this.catalogService = catalogService;
  }

  /**
   * Evaluate policy for dataset access
   */
  async evaluateDatasetAccess(
    user: User,
    context: DatasetAccessContext,
  ): Promise<{
    allow: boolean;
    reasons: string[];
    requiredAuthority?: string[];
  }> {
    const reasons: string[] = [];

    try {
      // Get dataset metadata
      const dataset = await this.catalogService.getDataset(context.datasetId);

      if (!dataset) {
        reasons.push(`Dataset '${context.datasetId}' not found in catalog`);
        return { allow: false, reasons };
      }

      // Check if dataset is deprecated
      if (dataset.deprecatedAt) {
        reasons.push(
          `Dataset '${context.datasetId}' is deprecated and should not be used`,
        );
        logger.warn({
          message: 'Access to deprecated dataset',
          datasetId: context.datasetId,
          userId: user.id,
        });
      }

      // Check classification level against clearance
      const requiredClearance = this.getRequiredClearanceForClassification(
        dataset.classificationLevel,
      );

      if (user.clearance_level < requiredClearance) {
        reasons.push(
          `Insufficient clearance for ${dataset.classificationLevel} data (required: ${requiredClearance}, user: ${user.clearance_level})`,
        );
      }

      // Check authority requirements from catalog
      if (dataset.authorityRequirements && dataset.authorityRequirements.length > 0) {
        const hasRequiredAuthority = dataset.authorityRequirements.every((reqAuth) =>
          user.authority_bindings.some((binding) => binding.type === reqAuth),
        );

        if (!hasRequiredAuthority) {
          reasons.push(
            `Missing required authority: ${dataset.authorityRequirements.join(', ')}`,
          );
          return {
            allow: false,
            reasons,
            requiredAuthority: dataset.authorityRequirements,
          };
        }
      }

      // PII access requires additional checks
      if (dataset.containsPersonalData) {
        if (!context.reasonForAccess || context.reasonForAccess.length < 10) {
          reasons.push(
            'Reason for access required for datasets containing personal data',
          );
        }

        // PII access requires at least LICENSE authority
        const hasLicense = user.authority_bindings.some(
          (binding) => binding.type === 'LICENSE',
        );
        if (!hasLicense) {
          reasons.push('License required for PII access');
        }
      }

      // Financial data requires higher clearance
      if (dataset.containsFinancialData && user.clearance_level < 4) {
        reasons.push('Clearance level 4+ required for financial data access');
      }

      // Health data requires special authority
      if (dataset.containsHealthData) {
        const hasHealthAuthority = user.authority_bindings.some(
          (binding) =>
            binding.type === 'ADMIN_AUTH' || binding.type === 'WARRANT',
        );
        if (!hasHealthAuthority) {
          reasons.push('Special authority required for health data access');
        }
      }

      // Export requires additional authority
      if (context.accessType === 'export') {
        const hasExportAuthority = user.authority_bindings.some(
          (binding) =>
            binding.type === 'SUBPOENA' ||
            binding.type === 'COURT_ORDER' ||
            binding.type === 'ADMIN_AUTH',
        );
        if (!hasExportAuthority) {
          reasons.push('Export authority required (SUBPOENA, COURT_ORDER, or ADMIN_AUTH)');
        }
      }

      // Delete requires admin authority
      if (context.accessType === 'delete') {
        const hasDeleteAuthority = user.authority_bindings.some(
          (binding) => binding.type === 'ADMIN_AUTH',
        );
        if (!hasDeleteAuthority) {
          reasons.push('Admin authority required for delete operations');
        }
      }

      // Check license status (Foster dissent)
      if (user.license_status !== 'ACTIVE') {
        reasons.push('Active license required - Foster dissent protection');
      }

      // Check TOS acceptance
      if (!user.tos_accepted) {
        reasons.push('Terms of Service acceptance required');
      }

      const allow = reasons.length === 0;

      // Log access attempt
      await this.catalogService.logAccess(
        context.datasetId,
        user.id,
        context.accessType,
        allow,
        {
          accessMethod: context.accessMethod,
          authorityBindingType: user.authority_bindings[0]?.type,
          clearanceLevel: user.clearance_level,
          reasonForAccess: context.reasonForAccess,
          queryHash: context.queryHash,
          denialReason: allow ? undefined : reasons.join('; '),
        },
      );

      logger.info({
        message: 'Dataset access evaluation',
        datasetId: context.datasetId,
        userId: user.id,
        accessType: context.accessType,
        allow,
        reasons,
      });

      return {
        allow,
        reasons,
        requiredAuthority: dataset.authorityRequirements,
      };
    } catch (error) {
      logger.error({
        message: 'Error evaluating dataset access',
        error: error.message,
        datasetId: context.datasetId,
        userId: user.id,
      });

      reasons.push(`Internal error: ${error.message}`);
      return { allow: false, reasons };
    }
  }

  /**
   * Map classification level to clearance level
   */
  private getRequiredClearanceForClassification(
    classificationLevel: string,
  ): number {
    const clearanceMap: Record<string, number> = {
      public: 1,
      internal: 2,
      confidential: 3,
      restricted: 4,
      regulated: 5,
    };

    return clearanceMap[classificationLevel] || 1;
  }

  /**
   * Get datasets accessible by user
   */
  async getAccessibleDatasets(user: User): Promise<string[]> {
    try {
      const allDatasets = await this.catalogService.listDatasets({}, 1000);
      const accessible: string[] = [];

      for (const dataset of allDatasets) {
        const decision = await this.evaluateDatasetAccess(user, {
          datasetId: dataset.datasetId,
          accessType: 'read',
          accessMethod: 'catalog-query',
        });

        if (decision.allow) {
          accessible.push(dataset.datasetId);
        }
      }

      return accessible;
    } catch (error) {
      logger.error({
        message: 'Error getting accessible datasets',
        error: error.message,
        userId: user.id,
      });
      return [];
    }
  }
}

/**
 * Express middleware for dataset access control
 */
export const requireDatasetAccess = (
  catalogService: CatalogService,
  getDatasetId: (req: Request) => string,
  accessType: 'read' | 'write' | 'export' | 'delete' = 'read',
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const datasetId = getDatasetId(req);

    if (!datasetId) {
      return res.status(400).json({
        error: 'Dataset ID required',
        code: 'DATASET_ID_REQUIRED',
      });
    }

    const guard = new CatalogAuthorityGuard(catalogService);

    const reasonForAccess = req.headers['x-reason-for-access'] as string;

    const decision = await guard.evaluateDatasetAccess(user, {
      datasetId,
      accessType,
      accessMethod: req.method,
      reasonForAccess,
    });

    if (!decision.allow) {
      logger.warn({
        message: 'Dataset access denied',
        datasetId,
        userId: user.id,
        accessType,
        reasons: decision.reasons,
      });

      return res.status(403).json({
        error: 'Dataset access denied',
        reasons: decision.reasons,
        requiredAuthority: decision.requiredAuthority,
        code: 'DATASET_ACCESS_DENIED',
      });
    }

    // Attach dataset context to request
    req.catalogContext = {
      datasetId,
      accessType,
      decision,
    };

    logger.info({
      message: 'Dataset access granted',
      datasetId,
      userId: user.id,
      accessType,
    });

    next();
  };
};

/**
 * Decorator for policy-based dataset access
 */
export function DatasetPolicy(
  datasetId: string,
  accessType: 'read' | 'write' | 'export' | 'delete' = 'read',
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [req, res] = args;
      const user = req.user as User;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      const catalogService = req.catalogService as CatalogService;
      if (!catalogService) {
        logger.error('CatalogService not available in request');
        return res.status(500).json({
          error: 'Internal server error',
          code: 'CATALOG_SERVICE_MISSING',
        });
      }

      const guard = new CatalogAuthorityGuard(catalogService);

      const decision = await guard.evaluateDatasetAccess(user, {
        datasetId,
        accessType,
        accessMethod: req.method,
        reasonForAccess: req.headers['x-reason-for-access'] as string,
      });

      if (!decision.allow) {
        return res.status(403).json({
          error: 'Dataset access denied',
          reasons: decision.reasons,
          requiredAuthority: decision.requiredAuthority,
          code: 'DATASET_ACCESS_DENIED',
        });
      }

      req.catalogContext = { datasetId, accessType, decision };

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export default CatalogAuthorityGuard;
