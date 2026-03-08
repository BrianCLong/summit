"use strict";
/**
 * Copilot Governance Service
 *
 * Generates governance verdicts for all copilot/AI outputs.
 * Integrates with guardrails and policy evaluation to ensure compliance.
 *
 * SOC 2 Controls:
 * - CC6.1: Logical access controls
 * - CC7.2: System change management
 * - PI1.3: Processing integrity - accurate processing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotGovernanceService = void 0;
exports.createCopilotGovernanceService = createCopilotGovernanceService;
exports.initializeCopilotGovernance = initializeCopilotGovernance;
exports.getCopilotGovernance = getCopilotGovernance;
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'copilot-governance' });
/**
 * Copilot Governance Service
 *
 * Ensures all copilot responses include governance verdicts.
 * Makes bypassing governance structurally impossible.
 */
class CopilotGovernanceService {
    evaluatedBy = 'ai-copilot-service';
    /**
     * Generate governance verdict for approved answer
     */
    generateApprovedVerdict(answer, guardrails) {
        const timestamp = new Date().toISOString();
        // Determine confidence based on answer confidence and guardrails
        const baseConfidence = answer.confidence;
        const guardrailPassed = guardrails.passed;
        const wasRedacted = answer.redaction.wasRedacted;
        // Reduce confidence if redacted or guardrails had issues
        let adjustedConfidence = baseConfidence;
        if (wasRedacted) {
            adjustedConfidence *= 0.95; // 5% reduction for redaction
        }
        if (!guardrailPassed) {
            adjustedConfidence *= 0.85; // 15% reduction for guardrail concerns
        }
        // Determine risk level
        let riskLevel = 'low';
        if (!guardrailPassed) {
            riskLevel = 'high';
        }
        else if (wasRedacted && answer.redaction.redactedCount > 5) {
            riskLevel = 'medium';
        }
        else if (wasRedacted) {
            riskLevel = 'low';
        }
        const verdict = {
            verdict: 'APPROVED',
            policy: 'copilot-answer-policy',
            rationale: `Answer generated with ${answer.citations.length} citations, ${guardrailPassed ? 'passed' : 'conditional pass on'} guardrails${wasRedacted ? `, ${answer.redaction.redactedCount} items redacted` : ''}`,
            timestamp,
            evaluatedBy: this.evaluatedBy,
            confidence: Math.max(0, Math.min(1, adjustedConfidence)),
            metadata: {
                policyVersion: '1.0.0',
                riskLevel,
                soc2Controls: ['CC6.1', 'CC7.2', 'PI1.3'],
                evidence: [
                    `Citations: ${answer.citations.length}`,
                    `Provenance chain confidence: ${answer.provenance.chainConfidence}`,
                    `Guardrails: ${guardrails.passed ? 'PASSED' : 'CONDITIONAL'}`,
                    `Redaction: ${wasRedacted ? `${answer.redaction.redactedCount} items` : 'none'}`,
                ],
                citationCount: answer.citations.length,
                provenanceConfidence: answer.provenance.chainConfidence,
                redactionApplied: wasRedacted,
            },
        };
        logger.info({
            answerId: answer.answerId,
            verdict: verdict.verdict,
            confidence: verdict.confidence,
            riskLevel,
        }, 'Generated governance verdict for answer');
        return verdict;
    }
    /**
     * Generate governance verdict for refusal
     */
    generateRefusalVerdict(refusal) {
        const timestamp = new Date().toISOString();
        // Determine verdict type based on refusal category
        let verdictType = 'REJECTED';
        let riskLevel = 'medium';
        let confidence = 1.0;
        switch (refusal.category) {
            case 'policy_violation':
                verdictType = 'REJECTED';
                riskLevel = 'critical';
                confidence = 1.0;
                break;
            case 'authorization_denied':
                verdictType = 'REJECTED';
                riskLevel = 'high';
                confidence = 1.0;
                break;
            case 'unsafe_query':
                verdictType = 'REJECTED';
                riskLevel = 'critical';
                confidence = 1.0;
                break;
            case 'no_citations_available':
                verdictType = 'REQUIRES_REVIEW';
                riskLevel = 'medium';
                confidence = 0.9;
                break;
            case 'redaction_complete':
                verdictType = 'REJECTED';
                riskLevel = 'high';
                confidence = 1.0;
                break;
            case 'rate_limited':
                verdictType = 'REJECTED';
                riskLevel = 'low';
                confidence = 1.0;
                break;
            case 'internal_error':
                verdictType = 'REQUIRES_REVIEW';
                riskLevel = 'medium';
                confidence = 0.8;
                break;
        }
        const verdict = {
            verdict: verdictType,
            policy: 'copilot-refusal-policy',
            rationale: `Request refused: ${refusal.reason} (category: ${refusal.category})`,
            timestamp,
            evaluatedBy: this.evaluatedBy,
            confidence,
            metadata: {
                policyVersion: '1.0.0',
                riskLevel,
                soc2Controls: ['CC6.1', 'CC7.2', 'PI1.3'],
                evidence: [refusal.reason],
                remediationSuggestions: refusal.suggestions,
                refusalCategory: refusal.category,
                auditId: refusal.auditId,
            },
        };
        logger.info({
            refusalId: refusal.refusalId,
            verdict: verdict.verdict,
            category: refusal.category,
            riskLevel,
        }, 'Generated governance verdict for refusal');
        return verdict;
    }
    /**
     * Generate governance verdict for prompt validation
     */
    generatePromptVerdict(promptAllowed, reason, riskLevel = 'low') {
        const timestamp = new Date().toISOString();
        return {
            verdict: promptAllowed ? 'APPROVED' : 'REJECTED',
            policy: 'prompt-guardrails-policy',
            rationale: promptAllowed
                ? 'Prompt passed guardrail validation'
                : reason || 'Prompt failed guardrail validation',
            timestamp,
            evaluatedBy: this.evaluatedBy,
            confidence: 1.0,
            metadata: {
                policyVersion: '1.0.0',
                riskLevel,
                soc2Controls: ['CC6.1', 'PI1.3'],
                evidence: reason ? [reason] : undefined,
                remediationSuggestions: !promptAllowed
                    ? [
                        'Rephrase your question to be more specific',
                        'Avoid sensitive or potentially harmful content',
                        'Review prompt guidelines',
                    ]
                    : undefined,
            },
        };
    }
    /**
     * Validate that a response includes governance verdict
     *
     * This is a fail-safe check to ensure no response escapes without a verdict.
     */
    validateResponseHasVerdict(response) {
        if (!response) {
            logger.error('Response is null or undefined');
            return false;
        }
        if (response.type === 'answer' || response.type === 'refusal') {
            const hasVerdict = response.data?.governanceVerdict !== undefined;
            if (!hasVerdict) {
                logger.error({
                    responseType: response.type,
                    hasData: !!response.data,
                }, 'CRITICAL: Response missing governance verdict');
            }
            return hasVerdict;
        }
        // Preview responses don't require verdicts
        return true;
    }
    /**
     * Generate emergency rejection verdict
     *
     * Used when normal verdict generation fails - ensures no response
     * can escape without a verdict.
     */
    generateEmergencyRejection(reason) {
        logger.error({ reason }, 'Emergency governance rejection generated');
        return {
            verdict: 'REJECTED',
            policy: 'emergency-failsafe',
            rationale: `Emergency rejection: ${reason}`,
            timestamp: new Date().toISOString(),
            evaluatedBy: this.evaluatedBy,
            confidence: 1.0,
            metadata: {
                policyVersion: '1.0.0',
                riskLevel: 'critical',
                soc2Controls: ['CC6.1', 'CC7.2', 'PI1.3'],
                evidence: [reason],
                remediationSuggestions: [
                    'Contact security team immediately',
                    'Review system logs',
                    'Do not retry without investigation',
                ],
                isEmergencyFailsafe: true,
            },
        };
    }
}
exports.CopilotGovernanceService = CopilotGovernanceService;
/**
 * Create copilot governance service
 */
function createCopilotGovernanceService() {
    return new CopilotGovernanceService();
}
/**
 * Singleton instance
 */
let serviceInstance = null;
/**
 * Initialize singleton
 */
function initializeCopilotGovernance() {
    serviceInstance = new CopilotGovernanceService();
    logger.info('Copilot governance service initialized');
    return serviceInstance;
}
/**
 * Get singleton
 */
function getCopilotGovernance() {
    if (!serviceInstance) {
        serviceInstance = new CopilotGovernanceService();
        logger.warn('Copilot governance service auto-initialized');
    }
    return serviceInstance;
}
