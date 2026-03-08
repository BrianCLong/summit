"use strict";
/**
 * Redaction Service
 *
 * Ensures redacted fields are never surfaced in responses.
 * Features:
 * - Policy label-based redaction
 * - Classification-aware filtering
 * - Uncertainty indication for partial evidence
 * - Audit logging of redaction decisions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionService = exports.CLASSIFICATION_LEVELS = void 0;
exports.createRedactionService = createRedactionService;
exports.createRedactionServiceForUser = createRedactionServiceForUser;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'redaction-service' });
/**
 * Policy classification levels (in order of restrictiveness)
 */
exports.CLASSIFICATION_LEVELS = [
    'UNCLASSIFIED',
    'FOUO',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'SCI',
];
/**
 * Default redaction policy
 */
const DEFAULT_POLICY = {
    userClearance: 'UNCLASSIFIED',
    allowedPolicyLabels: ['PUBLIC', 'UNCLASSIFIED'],
    deniedPolicyLabels: ['PII', 'CLASSIFIED', 'RESTRICTED'],
    showPartialContent: false,
    redactionPlaceholder: '[REDACTED]',
    auditRedactions: true,
};
/**
 * Redaction Service
 */
class RedactionService {
    policy;
    decisions = [];
    constructor(policy) {
        this.policy = { ...DEFAULT_POLICY, ...policy };
    }
    /**
     * Apply redaction to a copilot answer
     */
    redactAnswer(answer) {
        const startTime = Date.now();
        const decisions = [];
        let redactedCount = 0;
        // Redact citations
        const redactedCitations = [];
        for (const citation of answer.citations) {
            const result = this.redactCitation(citation);
            redactedCitations.push(result.content);
            decisions.push(...result.decisions);
            if (result.wasRedacted)
                redactedCount++;
        }
        // Redact answer text (remove any inline sensitive content)
        const answerResult = this.redactText(answer.answer, 'answer_text', answer.citations.flatMap((c) => c.policyLabels || []));
        decisions.push(...answerResult.decisions);
        if (answerResult.wasRedacted)
            redactedCount++;
        // Update provenance to remove redacted references
        const redactedProvenance = this.redactProvenance(answer.provenance, redactedCitations);
        decisions.push(...redactedProvenance.decisions);
        // Calculate uncertainty level
        const uncertaintyLevel = this.calculateUncertainty(redactedCount, answer.citations.length, answer.provenance.entityIds.length);
        // Build explanation
        const explanation = this.buildRedactionExplanation(redactedCount, uncertaintyLevel, decisions);
        // Update answer warnings if redactions occurred
        const warnings = [...answer.warnings];
        if (redactedCount > 0) {
            warnings.push(`${redactedCount} item(s) were redacted due to policy restrictions.`);
        }
        if (uncertaintyLevel !== 'none') {
            warnings.push(`Answer may be incomplete due to ${uncertaintyLevel} uncertainty from redacted content.`);
        }
        const redactedAnswer = {
            ...answer,
            answer: answerResult.content,
            citations: redactedCitations,
            provenance: redactedProvenance.content,
            redaction: {
                wasRedacted: redactedCount > 0,
                redactedCount,
                redactionTypes: this.getRedactionTypes(decisions),
                uncertaintyAcknowledged: uncertaintyLevel !== 'none',
            },
            warnings,
        };
        // Audit logging
        if (this.policy.auditRedactions && redactedCount > 0) {
            logger.info({
                answerId: answer.answerId,
                redactedCount,
                uncertaintyLevel,
                decisions: decisions.filter((d) => d.redacted),
            }, 'Redaction applied to answer');
        }
        return {
            content: redactedAnswer,
            wasRedacted: redactedCount > 0,
            redactedCount,
            decisions,
            uncertaintyLevel,
            explanation,
        };
    }
    /**
     * Generic redact method for simple string redaction
     */
    async redact(text, _policy) {
        const result = this.redactText(text, 'generic', []);
        return result.content;
    }
    /**
     * Redact a single citation
     */
    redactCitation(citation) {
        const decisions = [];
        let wasRedacted = false;
        // Check if entire citation should be redacted
        if (this.shouldRedact(citation.policyLabels || [])) {
            const decision = {
                decisionId: (0, crypto_1.randomUUID)(),
                field: `citation_${citation.id}`,
                redacted: true,
                reason: 'Policy labels require redaction',
                policyLabels: citation.policyLabels || [],
                timestamp: new Date().toISOString(),
            };
            decisions.push(decision);
            return {
                content: {
                    ...citation,
                    label: this.policy.redactionPlaceholder,
                    excerpt: this.policy.redactionPlaceholder,
                    wasRedacted: true,
                },
                wasRedacted: true,
                redactedCount: 1,
                decisions,
                uncertaintyLevel: 'medium',
                explanation: `Citation ${citation.id} was redacted due to policy restrictions`,
            };
        }
        // Check for partial redaction (excerpt only)
        if (citation.excerpt && this.containsSensitiveContent(citation.excerpt)) {
            const decision = {
                decisionId: (0, crypto_1.randomUUID)(),
                field: `citation_${citation.id}_excerpt`,
                redacted: true,
                reason: 'Excerpt contains sensitive content',
                policyLabels: citation.policyLabels || [],
                timestamp: new Date().toISOString(),
            };
            decisions.push(decision);
            wasRedacted = true;
            return {
                content: {
                    ...citation,
                    excerpt: this.policy.showPartialContent
                        ? this.partialRedact(citation.excerpt)
                        : this.policy.redactionPlaceholder,
                    wasRedacted: true,
                },
                wasRedacted: true,
                redactedCount: 1,
                decisions,
                uncertaintyLevel: 'low',
                explanation: 'Citation excerpt was partially redacted',
            };
        }
        // No redaction needed
        decisions.push({
            decisionId: (0, crypto_1.randomUUID)(),
            field: `citation_${citation.id}`,
            redacted: false,
            reason: 'Content passes policy checks',
            policyLabels: citation.policyLabels || [],
            timestamp: new Date().toISOString(),
        });
        return {
            content: citation,
            wasRedacted: false,
            redactedCount: 0,
            decisions,
            uncertaintyLevel: 'none',
            explanation: '',
        };
    }
    /**
     * Redact text content
     */
    redactText(text, fieldName, policyLabels) {
        const decisions = [];
        // Check for sensitive patterns
        const sensitivePatterns = [
            { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
            { pattern: /\b[A-Z]{2}\d{6,}\b/g, type: 'ID_NUMBER' },
            {
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                type: 'EMAIL',
            },
            {
                pattern: /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
                type: 'PHONE',
            },
            { pattern: /(\(\d{3}\)\s*\d{3}-\d{4})|(\b\d{3}-\d{2}-\d{4}\b)/g, type: 'PHONE' },
            { pattern: /\bCLASSIFIED\b/gi, type: 'CLASSIFICATION_MARKER' },
            { pattern: /\bSECRET\b/gi, type: 'CLASSIFICATION_MARKER' },
            { pattern: /\bTOP SECRET\b/gi, type: 'CLASSIFICATION_MARKER' },
        ];
        let redactedText = text;
        let wasRedacted = false;
        let redactedCount = 0;
        for (const { pattern, type } of sensitivePatterns) {
            const matches = redactedText.match(pattern);
            if (matches && matches.length > 0) {
                redactedText = redactedText.replace(pattern, this.policy.redactionPlaceholder);
                wasRedacted = true;
                redactedCount += matches.length;
                decisions.push({
                    decisionId: (0, crypto_1.randomUUID)(),
                    field: `${fieldName}_${type}`,
                    redacted: true,
                    reason: `Pattern ${type} detected and redacted`,
                    policyLabels,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        // Check policy labels
        if (this.shouldRedact(policyLabels)) {
            decisions.push({
                decisionId: (0, crypto_1.randomUUID)(),
                field: fieldName,
                redacted: true,
                reason: 'Policy labels require redaction',
                policyLabels,
                timestamp: new Date().toISOString(),
            });
            // Note: We already did pattern-based redaction, don't redact entire text
        }
        return {
            content: redactedText,
            wasRedacted,
            redactedCount,
            decisions,
            uncertaintyLevel: wasRedacted ? 'low' : 'none',
            explanation: wasRedacted
                ? `${redactedCount} sensitive pattern(s) redacted`
                : '',
        };
    }
    /**
     * Redact provenance to remove references to redacted content
     */
    redactProvenance(provenance, redactedCitations) {
        const decisions = [];
        // Get IDs of redacted citations
        const redactedEntityIds = new Set(redactedCitations
            .filter((c) => c.wasRedacted && c.sourceType === 'graph_entity')
            .map((c) => c.sourceId));
        const redactedEvidenceIds = new Set(redactedCitations
            .filter((c) => c.wasRedacted && c.sourceType === 'evidence')
            .map((c) => c.sourceId));
        const redactedClaimIds = new Set(redactedCitations
            .filter((c) => c.wasRedacted && c.sourceType === 'claim')
            .map((c) => c.sourceId));
        // Filter provenance
        const filteredEntityIds = provenance.entityIds.filter((id) => !redactedEntityIds.has(id));
        const filteredEvidenceIds = provenance.evidenceIds.filter((id) => !redactedEvidenceIds.has(id));
        const filteredClaimIds = provenance.claimIds.filter((id) => !redactedClaimIds.has(id));
        const wasRedacted = filteredEntityIds.length < provenance.entityIds.length ||
            filteredEvidenceIds.length < provenance.evidenceIds.length ||
            filteredClaimIds.length < provenance.claimIds.length;
        if (wasRedacted) {
            decisions.push({
                decisionId: (0, crypto_1.randomUUID)(),
                field: 'provenance',
                redacted: true,
                reason: 'Removed references to redacted content',
                policyLabels: [],
                timestamp: new Date().toISOString(),
            });
        }
        // Adjust chain confidence based on redaction
        const originalCount = provenance.entityIds.length +
            provenance.evidenceIds.length +
            provenance.claimIds.length;
        const filteredCount = filteredEntityIds.length +
            filteredEvidenceIds.length +
            filteredClaimIds.length;
        const confidenceAdjustment = originalCount > 0 ? filteredCount / originalCount : 1;
        return {
            content: {
                ...provenance,
                entityIds: filteredEntityIds,
                evidenceIds: filteredEvidenceIds,
                claimIds: filteredClaimIds,
                chainConfidence: provenance.chainConfidence * confidenceAdjustment,
            },
            wasRedacted,
            redactedCount: originalCount - filteredCount,
            decisions,
            uncertaintyLevel: wasRedacted ? 'medium' : 'none',
            explanation: wasRedacted
                ? 'Provenance adjusted for redacted content'
                : '',
        };
    }
    /**
     * Check if content should be redacted based on policy labels
     */
    shouldRedact(policyLabels) {
        if (!policyLabels || policyLabels.length === 0) {
            return false;
        }
        // Check denied labels
        for (const label of policyLabels) {
            if (this.policy.deniedPolicyLabels.some((denied) => label.toUpperCase().includes(denied.toUpperCase()))) {
                return true;
            }
        }
        // Check classification level
        for (const label of policyLabels) {
            const labelLevel = this.getClassificationLevel(label);
            if (labelLevel) {
                const userLevelIndex = exports.CLASSIFICATION_LEVELS.indexOf(this.policy.userClearance);
                const labelLevelIndex = exports.CLASSIFICATION_LEVELS.indexOf(labelLevel);
                if (labelLevelIndex > userLevelIndex) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if text contains sensitive content
     */
    containsSensitiveContent(text) {
        const sensitivePatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\bCLASSIFIED\b/i,
            /\bSECRET\b/i,
            /\bTOP SECRET\b/i,
            /\(\d{3}\)\s*\d{3}-\d{4}/, // Phone Number
        ];
        return sensitivePatterns.some((pattern) => pattern.test(text));
    }
    /**
     * Get classification level from label
     */
    getClassificationLevel(label) {
        const upperLabel = label.toUpperCase();
        for (const level of exports.CLASSIFICATION_LEVELS) {
            if (upperLabel.includes(level)) {
                return level;
            }
        }
        return null;
    }
    /**
     * Partial redaction (keep some structure)
     */
    partialRedact(text) {
        if (text.length <= 20) {
            return this.policy.redactionPlaceholder;
        }
        // Keep first and last 5 characters
        return `${text.substring(0, 5)}${this.policy.redactionPlaceholder}${text.substring(text.length - 5)}`;
    }
    /**
     * Calculate uncertainty level
     */
    calculateUncertainty(redactedCount, totalCitations, totalEntities) {
        if (redactedCount === 0) {
            return 'none';
        }
        const total = totalCitations + totalEntities;
        if (total === 0) {
            return 'high';
        }
        const redactionRatio = redactedCount / total;
        if (redactionRatio >= 0.5) {
            return 'high';
        }
        else if (redactionRatio >= 0.25) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    /**
     * Get unique redaction types
     */
    getRedactionTypes(decisions) {
        const types = new Set();
        for (const decision of decisions) {
            if (decision.redacted) {
                // Extract type from field name
                const parts = decision.field.split('_');
                if (parts.length >= 2) {
                    types.add(parts[parts.length - 1]);
                }
                else {
                    types.add(decision.field);
                }
            }
        }
        return Array.from(types);
    }
    /**
     * Build explanation of redactions
     */
    buildRedactionExplanation(redactedCount, uncertaintyLevel, decisions) {
        if (redactedCount === 0) {
            return '';
        }
        const reasons = decisions
            .filter((d) => d.redacted)
            .map((d) => d.reason)
            .filter((r, i, arr) => arr.indexOf(r) === i); // Unique
        let explanation = `${redactedCount} item(s) were redacted.`;
        if (reasons.length > 0) {
            explanation += ` Reasons: ${reasons.join('; ')}.`;
        }
        if (uncertaintyLevel !== 'none') {
            explanation += ` This creates ${uncertaintyLevel} uncertainty in the answer.`;
        }
        return explanation;
    }
    /**
     * Update policy
     */
    updatePolicy(policy) {
        Object.assign(this.policy, policy);
        logger.info({ policy: this.policy }, 'Redaction policy updated');
    }
    /**
     * Get current policy
     */
    getPolicy() {
        return { ...this.policy };
    }
    /**
     * Get redaction decisions log
     */
    getDecisions() {
        return [...this.decisions];
    }
    /**
     * Clear decisions log
     */
    clearDecisions() {
        this.decisions.length = 0;
    }
}
exports.RedactionService = RedactionService;
/**
 * Create a redaction service
 */
function createRedactionService(policy) {
    return new RedactionService(policy);
}
/**
 * Factory for creating redaction service with user context
 */
function createRedactionServiceForUser(userClearance, allowedLabels) {
    return new RedactionService({
        userClearance,
        allowedPolicyLabels: allowedLabels || getLabelsForClearance(userClearance),
    });
}
/**
 * Get allowed labels for a clearance level
 */
function getLabelsForClearance(clearance) {
    const index = exports.CLASSIFICATION_LEVELS.indexOf(clearance);
    return exports.CLASSIFICATION_LEVELS.slice(0, index + 1).map((l) => l);
}
