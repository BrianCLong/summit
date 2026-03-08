"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeReviewAgent = void 0;
const ledger_js_1 = require("../provenance/ledger.js");
const types_js_1 = require("./types.js");
class ChangeReviewAgent {
    policyEngine;
    ledger;
    logger;
    constructor(policyEngine, logger, ledger = ledger_js_1.provenanceLedger) {
        this.policyEngine = policyEngine;
        this.logger = logger;
        this.ledger = ledger;
    }
    /**
     * Reviews a change request and provides an autonomous decision.
     */
    async reviewChange(request) {
        this.logger.info({ requestId: request.id }, 'Starting autonomous change review');
        // 1. Build Policy Context
        const context = this.buildContext(request);
        // 2. Evaluate Policy
        const policyDecision = await this.policyEngine.evaluate(request.authorId, 'merge_change', `change_request:${request.id}`, context);
        // 3. Determine Review Decision
        const result = this.mapPolicyToReviewResult(policyDecision, request);
        // 4. Log to Provenance Ledger
        await this.logDecision(request, result);
        return result;
    }
    buildContext(request) {
        // Determine autonomy level based on change type and size
        let autonomy = 0;
        const fileCount = request.files.length;
        const totalLines = request.files.reduce((acc, f) => acc + f.additions + f.deletions, 0);
        if (request.type === types_js_1.ChangeType.DOCS) {
            autonomy = 5; // High autonomy for docs
        }
        else if (request.type === types_js_1.ChangeType.CONFIG && request.metadata?.env === 'dev') {
            autonomy = 4;
        }
        else if (fileCount < 5 && totalLines < 100) {
            autonomy = 3; // Medium autonomy for small changes
        }
        else {
            autonomy = 1; // Low autonomy for large changes
        }
        // Determine sensitivity
        let sensitivity = 'medium';
        if (request.type === types_js_1.ChangeType.INFRA || request.title.toLowerCase().includes('critical')) {
            sensitivity = 'critical';
        }
        else if (request.type === types_js_1.ChangeType.DOCS) {
            sensitivity = 'low';
        }
        return {
            tenantId: request.tenantId,
            autonomy,
            budgets: {
                tokens: 0,
                usd: 0,
                timeMinutes: 0
            },
            resourceSensitivity: sensitivity
        };
    }
    mapPolicyToReviewResult(decision, request) {
        let reviewDecision;
        let confidence = 1.0;
        if (decision.allowed && !decision.requiresApproval) {
            reviewDecision = types_js_1.ReviewDecision.APPROVED;
            confidence = 0.95; // High confidence if policy allows without approval
        }
        else if (!decision.allowed) {
            reviewDecision = types_js_1.ReviewDecision.REJECTED;
            confidence = 0.9;
        }
        else {
            // Allowed but requires approval -> Needs Review
            reviewDecision = types_js_1.ReviewDecision.NEEDS_REVIEW;
            confidence = 0.8;
        }
        // Adjust confidence based on risk score
        if (decision.riskScore !== undefined) {
            if (decision.riskScore > 80)
                confidence -= 0.2;
            else if (decision.riskScore > 50)
                confidence -= 0.1;
        }
        return {
            decision: reviewDecision,
            rationale: decision.reason || 'Policy evaluation result',
            confidence,
            riskScore: decision.riskScore || 0,
            policyUsed: 'autonomous-review-policy-v1',
            conditions: decision.conditions,
            timestamp: new Date(),
        };
    }
    async logDecision(request, result) {
        try {
            await this.ledger.appendEntry({
                tenantId: request.tenantId,
                actionType: 'AUTONOMOUS_REVIEW_DECISION',
                resourceType: 'change_request',
                resourceId: request.id,
                actorId: 'change-review-agent',
                actorType: 'system',
                payload: {
                    request: {
                        id: request.id,
                        type: request.type,
                        title: request.title
                    },
                    decision: result.decision,
                    rationale: result.rationale,
                    riskScore: result.riskScore
                },
                metadata: {
                    confidence: result.confidence,
                    policyUsed: result.policyUsed
                },
                timestamp: result.timestamp
            });
            this.logger.info({ requestId: request.id, decision: result.decision }, 'Logged autonomous review decision');
        }
        catch (error) {
            this.logger.error({ error, requestId: request.id }, 'Failed to log review decision to ledger');
        }
    }
}
exports.ChangeReviewAgent = ChangeReviewAgent;
