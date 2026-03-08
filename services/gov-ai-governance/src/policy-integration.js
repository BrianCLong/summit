"use strict";
/**
 * OPA Policy Integration
 *
 * Integrates with Open Policy Agent for governance decisions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPolicyEvaluator = exports.HttpOPAClient = void 0;
exports.createPolicyClient = createPolicyClient;
/**
 * HTTP client for OPA service
 */
class HttpOPAClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async evaluate(input) {
        const response = await fetch(`${this.baseUrl}/v1/data/summit/gov/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
        });
        if (!response.ok) {
            throw new Error(`OPA evaluation failed: ${response.status}`);
        }
        const result = await response.json();
        return {
            allow: result.result?.allow ?? false,
            requireHumanReview: result.result?.require_human_review ?? true,
            auditRequired: result.result?.audit_required ?? true,
            biasAlert: result.result?.bias_alert ?? false,
            reasons: result.result?.reasons ?? [],
        };
    }
}
exports.HttpOPAClient = HttpOPAClient;
/**
 * In-memory policy evaluator for standalone operation
 * Implements the same rules as the OPA policy
 */
class InMemoryPolicyEvaluator {
    async evaluate(input) {
        const result = {
            allow: false,
            requireHumanReview: true,
            auditRequired: true,
            biasAlert: false,
            reasons: [],
        };
        // Model deployment rules
        if (input.action === 'deploy_model' && input.model) {
            if (input.model.riskLevel === 'unacceptable') {
                result.reasons.push('Unacceptable risk models cannot be deployed');
                return result;
            }
            if (input.model.ethicalReview.overallStatus !== 'approved') {
                result.reasons.push('Ethical review not approved');
                return result;
            }
            const requiredPrinciples = [
                'fairness', 'accountability', 'transparency', 'privacy',
                'security', 'human_oversight', 'non_discrimination', 'explainability',
            ];
            const assessed = new Set(input.model.ethicalReview.principlesAssessed);
            const missing = requiredPrinciples.filter((p) => !assessed.has(p));
            if (missing.length > 0) {
                result.reasons.push(`Missing ethical principles: ${missing.join(', ')}`);
                return result;
            }
            if (input.complianceScore !== undefined && input.complianceScore < 80) {
                result.reasons.push('Compliance score below 80%');
                return result;
            }
            result.allow = true;
            result.requireHumanReview = false;
        }
        // Decision making rules
        if (input.action === 'make_decision') {
            // High-risk requires human review
            if (input.model?.riskLevel === 'high') {
                result.requireHumanReview = true;
                result.reasons.push('High-risk model requires human review');
            }
            // Low confidence requires human review
            if (input.confidence !== undefined && input.confidence < 0.8) {
                result.requireHumanReview = true;
                result.reasons.push('Low confidence requires human review');
            }
            // Fundamental rights decisions require human review
            const fundamentalCategories = [
                'employment', 'credit', 'housing', 'education',
                'healthcare', 'benefits', 'law_enforcement',
            ];
            if (input.decisionCategory && fundamentalCategories.includes(input.decisionCategory)) {
                result.requireHumanReview = true;
                result.reasons.push('Fundamental rights decision requires human review');
            }
            // Check consent
            if (input.citizenConsent?.consentGiven && input.purpose) {
                if (input.citizenConsent.purposes.includes(input.purpose)) {
                    result.allow = true;
                }
                else {
                    result.reasons.push('Purpose not covered by consent');
                }
            }
        }
        // Data access rules
        if (input.action === 'access_data' || input.action === 'export_data') {
            if (input.requestor?.type === 'citizen' &&
                input.subject?.id === input.requestor.id) {
                result.allow = true;
                result.requireHumanReview = false;
            }
        }
        // Delete data rules
        if (input.action === 'delete_data') {
            if (input.requestor?.type === 'citizen' &&
                input.subject?.id === input.requestor.id &&
                !input.subject.legalHold) {
                result.allow = true;
                result.requireHumanReview = false;
            }
            else if (input.subject?.legalHold) {
                result.reasons.push('Data under legal hold');
            }
        }
        // Bias detection
        if (input.model?.biasAssessment) {
            for (const [attr, ratio] of Object.entries(input.model.biasAssessment.disparateImpactRatios)) {
                if (ratio < 0.8 || ratio > 1.25) {
                    result.biasAlert = true;
                    result.reasons.push(`Potential bias detected for ${attr} (ratio: ${ratio})`);
                }
            }
        }
        return result;
    }
}
exports.InMemoryPolicyEvaluator = InMemoryPolicyEvaluator;
/**
 * Create policy client based on environment
 */
function createPolicyClient() {
    const opaUrl = process.env.OPA_URL;
    if (opaUrl) {
        return new HttpOPAClient(opaUrl);
    }
    return new InMemoryPolicyEvaluator();
}
