"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseCriteriaService = void 0;
const CaseRepo_js_1 = require("../repos/CaseRepo.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const serviceLogger = logger_js_1.default.child({ name: 'ReleaseCriteriaService' });
class ReleaseCriteriaService {
    caseRepo;
    constructor(pg) {
        this.caseRepo = new CaseRepo_js_1.CaseRepo(pg);
    }
    /**
     * Configure release criteria for a case
     */
    async configure(caseId, tenantId, userId, config) {
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
    async evaluate(caseId, tenantId) {
        const caseRecord = await this.caseRepo.findById(caseId, tenantId);
        if (!caseRecord) {
            throw new Error('Case not found');
        }
        const config = caseRecord.metadata?.releaseCriteria || {};
        const reasons = [];
        // Default config if not present
        const effectiveConfig = {
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
exports.ReleaseCriteriaService = ReleaseCriteriaService;
