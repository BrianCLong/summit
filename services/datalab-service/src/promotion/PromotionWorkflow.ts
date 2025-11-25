import { v4 as uuidv4 } from 'uuid';
import {
  PromotionRequest,
  PromotionRequestSchema,
  PromotionStatus,
} from '@intelgraph/sandbox-tenant-profile';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PromotionWorkflow');

/**
 * Validation check types
 */
export enum ValidationCheckType {
  SECURITY_SCAN = 'security_scan',
  PERFORMANCE_TEST = 'performance_test',
  COMPLIANCE_CHECK = 'compliance_check',
  DATA_LEAKAGE_SCAN = 'data_leakage_scan',
  CODE_REVIEW = 'code_review',
  INTEGRATION_TEST = 'integration_test',
}

/**
 * Validation check result
 */
export interface ValidationCheckResult {
  checkType: ValidationCheckType;
  passed: boolean;
  score?: number;
  findings: string[];
  recommendations: string[];
  executionTimeMs: number;
}

/**
 * Promotion workflow configuration
 */
export interface PromotionWorkflowConfig {
  requiredApprovals: number;
  requiredChecks: ValidationCheckType[];
  autoPromoteOnApproval: boolean;
  notifyOnStatusChange: boolean;
  rollbackTimeoutMs: number;
}

/**
 * Default workflow configuration
 */
const DEFAULT_CONFIG: PromotionWorkflowConfig = {
  requiredApprovals: 2,
  requiredChecks: [
    ValidationCheckType.SECURITY_SCAN,
    ValidationCheckType.DATA_LEAKAGE_SCAN,
    ValidationCheckType.COMPLIANCE_CHECK,
  ],
  autoPromoteOnApproval: false,
  notifyOnStatusChange: true,
  rollbackTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * PromotionWorkflow manages the process of promoting
 * sandbox configurations, scripts, and workflows to production.
 */
export class PromotionWorkflow {
  private promotions: Map<string, PromotionRequest> = new Map();
  private config: PromotionWorkflowConfig;
  private validators: Map<ValidationCheckType, (request: PromotionRequest) => Promise<ValidationCheckResult>> = new Map();

  constructor(config?: Partial<PromotionWorkflowConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultValidators();
  }

  /**
   * Create a new promotion request
   */
  async createRequest(
    sandboxId: string,
    targetTenantId: string,
    requesterId: string,
    artifactInfo: {
      type: PromotionRequest['promotionType'];
      id: string;
      name: string;
      version?: string;
    },
    justification: string,
    rollbackPlan?: string
  ): Promise<PromotionRequest> {
    const request: PromotionRequest = PromotionRequestSchema.parse({
      id: uuidv4(),
      sandboxId,
      targetTenantId,
      requesterId,
      promotionType: artifactInfo.type,
      artifactId: artifactInfo.id,
      artifactName: artifactInfo.name,
      artifactVersion: artifactInfo.version,
      status: PromotionStatus.DRAFT,
      reviewers: [],
      approvals: [],
      validationResults: {},
      justification,
      rollbackPlan,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.promotions.set(request.id, request);

    logger.info('Created promotion request', {
      requestId: request.id,
      sandboxId,
      artifactType: artifactInfo.type,
      artifactName: artifactInfo.name,
    });

    return request;
  }

  /**
   * Submit request for review
   */
  async submitForReview(
    requestId: string,
    reviewers: string[]
  ): Promise<PromotionRequest> {
    const request = this.promotions.get(requestId);
    if (!request) {
      throw new Error(`Promotion request not found: ${requestId}`);
    }

    if (request.status !== PromotionStatus.DRAFT) {
      throw new Error(`Cannot submit request in status: ${request.status}`);
    }

    // Run validation checks
    const validationResults = await this.runValidations(request);

    // Check if all required validations passed
    const allPassed = this.config.requiredChecks.every(check => {
      const result = validationResults[check];
      return result && result.passed;
    });

    if (!allPassed) {
      logger.warn('Promotion request failed validations', {
        requestId,
        validationResults,
      });
    }

    // Update request
    request.reviewers = reviewers;
    request.validationResults = {
      securityScan: validationResults.security_scan
        ? { passed: validationResults.security_scan.passed, findings: validationResults.security_scan.findings }
        : undefined,
      performanceTest: validationResults.performance_test
        ? { passed: validationResults.performance_test.passed, metrics: {} }
        : undefined,
      complianceCheck: validationResults.compliance_check
        ? { passed: validationResults.compliance_check.passed, violations: validationResults.compliance_check.findings }
        : undefined,
      dataLeakageScan: validationResults.data_leakage_scan
        ? { passed: validationResults.data_leakage_scan.passed, risks: validationResults.data_leakage_scan.findings }
        : undefined,
    };
    request.status = PromotionStatus.PENDING_REVIEW;
    request.updatedAt = new Date();

    this.promotions.set(requestId, request);

    logger.info('Submitted promotion for review', {
      requestId,
      reviewers,
      validationsPassed: allPassed,
    });

    return request;
  }

  /**
   * Add approval to request
   */
  async addApproval(
    requestId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comments?: string
  ): Promise<PromotionRequest> {
    const request = this.promotions.get(requestId);
    if (!request) {
      throw new Error(`Promotion request not found: ${requestId}`);
    }

    if (
      request.status !== PromotionStatus.PENDING_REVIEW &&
      request.status !== PromotionStatus.UNDER_REVIEW
    ) {
      throw new Error(`Cannot approve request in status: ${request.status}`);
    }

    if (!request.reviewers.includes(reviewerId)) {
      throw new Error(`User ${reviewerId} is not a reviewer for this request`);
    }

    // Add approval
    request.approvals.push({
      reviewerId,
      decision,
      comments,
      timestamp: new Date(),
    });

    // Update status based on decision
    if (decision === 'reject') {
      request.status = PromotionStatus.REJECTED;
    } else if (decision === 'request_changes') {
      request.status = PromotionStatus.DRAFT;
    } else {
      // Check if we have enough approvals
      const approvalCount = request.approvals.filter(
        a => a.decision === 'approve'
      ).length;

      if (approvalCount >= this.config.requiredApprovals) {
        request.status = PromotionStatus.APPROVED;

        // Auto-promote if configured
        if (this.config.autoPromoteOnApproval) {
          await this.executePromotion(requestId);
        }
      } else {
        request.status = PromotionStatus.UNDER_REVIEW;
      }
    }

    request.updatedAt = new Date();
    this.promotions.set(requestId, request);

    logger.info('Added approval to promotion', {
      requestId,
      reviewerId,
      decision,
      newStatus: request.status,
    });

    return request;
  }

  /**
   * Execute the promotion
   */
  async executePromotion(requestId: string): Promise<PromotionRequest> {
    const request = this.promotions.get(requestId);
    if (!request) {
      throw new Error(`Promotion request not found: ${requestId}`);
    }

    if (request.status !== PromotionStatus.APPROVED) {
      throw new Error(`Cannot execute promotion in status: ${request.status}`);
    }

    try {
      logger.info('Executing promotion', {
        requestId,
        artifactType: request.promotionType,
        targetTenant: request.targetTenantId,
      });

      // In a real implementation, this would:
      // 1. Copy the artifact to production
      // 2. Apply any necessary transformations
      // 3. Validate in production environment
      // 4. Update production configuration

      await this.simulatePromotion(request);

      request.status = PromotionStatus.PROMOTED;
      request.promotedAt = new Date();
      request.updatedAt = new Date();

      this.promotions.set(requestId, request);

      logger.info('Promotion executed successfully', {
        requestId,
        promotedAt: request.promotedAt,
      });

      return request;
    } catch (error) {
      logger.error('Promotion execution failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Rollback a promotion
   */
  async rollback(requestId: string, reason: string): Promise<PromotionRequest> {
    const request = this.promotions.get(requestId);
    if (!request) {
      throw new Error(`Promotion request not found: ${requestId}`);
    }

    if (request.status !== PromotionStatus.PROMOTED) {
      throw new Error(`Cannot rollback promotion in status: ${request.status}`);
    }

    // Check rollback timeout
    const promotedAt = request.promotedAt!;
    const rollbackDeadline = new Date(
      promotedAt.getTime() + this.config.rollbackTimeoutMs
    );

    if (new Date() > rollbackDeadline) {
      throw new Error('Rollback timeout exceeded');
    }

    logger.warn('Rolling back promotion', {
      requestId,
      reason,
      promotedAt,
    });

    // In a real implementation, this would:
    // 1. Remove or revert the promoted artifact
    // 2. Restore previous configuration
    // 3. Notify stakeholders

    request.status = PromotionStatus.ROLLED_BACK;
    request.updatedAt = new Date();

    this.promotions.set(requestId, request);

    return request;
  }

  /**
   * Get promotion request by ID
   */
  async getRequest(requestId: string): Promise<PromotionRequest | null> {
    return this.promotions.get(requestId) || null;
  }

  /**
   * List promotion requests for a sandbox
   */
  async listRequests(sandboxId: string): Promise<PromotionRequest[]> {
    return Array.from(this.promotions.values()).filter(
      r => r.sandboxId === sandboxId
    );
  }

  /**
   * Register a custom validator
   */
  registerValidator(
    checkType: ValidationCheckType,
    validator: (request: PromotionRequest) => Promise<ValidationCheckResult>
  ): void {
    this.validators.set(checkType, validator);
  }

  // Private methods

  private async runValidations(
    request: PromotionRequest
  ): Promise<Record<string, ValidationCheckResult>> {
    const results: Record<string, ValidationCheckResult> = {};

    for (const checkType of this.config.requiredChecks) {
      const validator = this.validators.get(checkType);
      if (validator) {
        results[checkType] = await validator(request);
      }
    }

    return results;
  }

  private registerDefaultValidators(): void {
    // Security scan validator
    this.validators.set(ValidationCheckType.SECURITY_SCAN, async (request) => {
      const startTime = Date.now();

      // Simulated security checks
      const findings: string[] = [];

      // Check for common security issues
      if (request.promotionType === 'script') {
        // Would analyze script for security vulnerabilities
      }

      return {
        checkType: ValidationCheckType.SECURITY_SCAN,
        passed: findings.length === 0,
        findings,
        recommendations: findings.length > 0
          ? ['Review and address security findings before promotion']
          : [],
        executionTimeMs: Date.now() - startTime,
      };
    });

    // Data leakage scan validator
    this.validators.set(ValidationCheckType.DATA_LEAKAGE_SCAN, async (request) => {
      const startTime = Date.now();

      // Simulated data leakage checks
      const findings: string[] = [];

      // Would check for:
      // - Production data references
      // - PII in configurations
      // - Hardcoded credentials

      return {
        checkType: ValidationCheckType.DATA_LEAKAGE_SCAN,
        passed: findings.length === 0,
        findings,
        recommendations: findings.length > 0
          ? ['Remove any references to production data before promotion']
          : [],
        executionTimeMs: Date.now() - startTime,
      };
    });

    // Compliance check validator
    this.validators.set(ValidationCheckType.COMPLIANCE_CHECK, async (request) => {
      const startTime = Date.now();

      // Simulated compliance checks
      const findings: string[] = [];

      // Would check for:
      // - Audit logging requirements
      // - Data handling policies
      // - Access control configurations

      return {
        checkType: ValidationCheckType.COMPLIANCE_CHECK,
        passed: findings.length === 0,
        findings,
        recommendations: [],
        executionTimeMs: Date.now() - startTime,
      };
    });

    // Performance test validator
    this.validators.set(ValidationCheckType.PERFORMANCE_TEST, async (request) => {
      const startTime = Date.now();

      // Simulated performance testing
      return {
        checkType: ValidationCheckType.PERFORMANCE_TEST,
        passed: true,
        score: 85,
        findings: [],
        recommendations: [],
        executionTimeMs: Date.now() - startTime,
      };
    });
  }

  private async simulatePromotion(request: PromotionRequest): Promise<void> {
    // Simulate promotion delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would actually copy/deploy the artifact
    logger.info('Simulated promotion execution', {
      requestId: request.id,
      artifactType: request.promotionType,
    });
  }
}

/**
 * Singleton instance
 */
let workflowInstance: PromotionWorkflow | null = null;

export function getPromotionWorkflow(
  config?: Partial<PromotionWorkflowConfig>
): PromotionWorkflow {
  if (!workflowInstance) {
    workflowInstance = new PromotionWorkflow(config);
  }
  return workflowInstance;
}
