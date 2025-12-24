
import { Pool } from 'pg';
import { CaseRepo } from '../repos/CaseRepo.js';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'ReleaseCriteriaService' });

export interface ReleaseCriteriaConfig {
  citationCoveragePercent?: number;
  locatorValidityPercent?: number;
  noOpenConflicts?: boolean;
  minCompletenessScore?: number;
  policyVersionPinned?: boolean;
  approvalsSatisfied?: boolean;
  hardBlock?: boolean; // If true, throw error on failure. If false, just warn.
}

export interface ReleaseBlockReason {
  code: string;
  message: string;
  remediation: string;
}

export interface ReleaseCriteriaResult {
  passed: boolean;
  reasons: ReleaseBlockReason[];
  config: ReleaseCriteriaConfig;
}

export class ReleaseCriteriaService {
  private caseRepo: CaseRepo;

  constructor(pg: Pool) {
    this.caseRepo = new CaseRepo(pg);
  }

  /**
   * Configure release criteria for a case
   */
  async configure(
    caseId: string,
    tenantId: string,
    userId: string,
    config: ReleaseCriteriaConfig
  ): Promise<void> {
    const caseRecord = await this.caseRepo.findById(caseId, tenantId);
    if (!caseRecord) {
      throw new Error('Case not found');
    }

    const metadata = caseRecord.metadata || {};
    metadata.releaseCriteria = config;

    await this.caseRepo.update({
      id: caseId,
      metadata
    }, userId);

    serviceLogger.info({ caseId, config }, 'Release criteria configured');
  }

  /**
   * Evaluate release criteria for a case
   */
  async evaluate(caseId: string, tenantId: string): Promise<ReleaseCriteriaResult> {
    const caseRecord = await this.caseRepo.findById(caseId, tenantId);
    if (!caseRecord) {
      throw new Error('Case not found');
    }

    const config = (caseRecord.metadata?.releaseCriteria as ReleaseCriteriaConfig) || {};
    const reasons: ReleaseBlockReason[] = [];

    // Default config if not present
    const effectiveConfig: ReleaseCriteriaConfig = {
      hardBlock: false, // Default to informational
      ...config
    };

    // 1. Citation Coverage
    if (effectiveConfig.citationCoveragePercent !== undefined) {
      // Mock check - in reality this would calculate actual coverage
      const currentCoverage = caseRecord.metadata?.citationCoverage || 0;
      if (currentCoverage < effectiveConfig.citationCoveragePercent) {
        reasons.push({
          code: 'CITATION_COVERAGE_LOW',
          message: `Citation coverage ${currentCoverage}% is below required ${effectiveConfig.citationCoveragePercent}%`,
          remediation: 'Add more citations to evidence.'
        });
      }
    }

    // 2. Locator Validity
    if (effectiveConfig.locatorValidityPercent !== undefined) {
      // Mock check
      const currentValidity = caseRecord.metadata?.locatorValidity || 100;
      if (currentValidity < effectiveConfig.locatorValidityPercent) {
        reasons.push({
          code: 'LOCATOR_VALIDITY_LOW',
          message: `Locator validity ${currentValidity}% is below required ${effectiveConfig.locatorValidityPercent}%`,
          remediation: 'Fix broken or invalid locators.'
        });
      }
    }

    // 3. No Open Conflicts
    if (effectiveConfig.noOpenConflicts) {
      // Mock check - assume conflicts are tracked in metadata or another service
      const openConflicts = caseRecord.metadata?.openConflictsCount || 0;
      if (openConflicts > 0) {
        reasons.push({
          code: 'OPEN_CONFLICTS',
          message: `There are ${openConflicts} open conflicts`,
          remediation: 'Resolve all conflicts before release.'
        });
      }
    }

    // 4. Minimum Completeness Score
    if (effectiveConfig.minCompletenessScore !== undefined) {
      const score = caseRecord.metadata?.completenessScore || 0;
      if (score < effectiveConfig.minCompletenessScore) {
        reasons.push({
          code: 'COMPLETENESS_LOW',
          message: `Completeness score ${score} is below required ${effectiveConfig.minCompletenessScore}`,
          remediation: 'Complete more sections of the case.'
        });
      }
    }

    // 5. Policy Version Pinned
    if (effectiveConfig.policyVersionPinned) {
        const isPinned = caseRecord.metadata?.policyVersionPinned === true;
        if (!isPinned) {
            reasons.push({
                code: 'POLICY_NOT_PINNED',
                message: 'Policy version is not pinned',
                remediation: 'Pin the policy version in case settings.'
            });
        }
    }

    // 6. Approvals Satisfied
    if (effectiveConfig.approvalsSatisfied) {
        const approvals = caseRecord.metadata?.approvals || [];
        // simple check: just need at least one approval for now as mock
        const hasApproval = approvals.length > 0;
        if (!hasApproval) {
             reasons.push({
                code: 'APPROVALS_MISSING',
                message: 'Required approvals are missing',
                remediation: 'Request and obtain necessary approvals.'
            });
        }
    }

    const passed = reasons.length === 0;

    serviceLogger.info({ caseId, passed, reasonsCount: reasons.length }, 'Release criteria evaluated');

    return {
      passed,
      reasons,
      config: effectiveConfig
    };
  }
}
