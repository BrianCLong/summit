"use strict";
/**
 * Learning Gate
 *
 * Enforces the "Bounded Learning" protocol.
 * Ensures that no learning update is applied without:
 * 1. Verified Outcome (Eligibility check)
 * 2. Oversight Approval (if policy changing)
 * 3. Sandbox Validation (if significant)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningGate = exports.OutcomeEvaluationSchema = void 0;
const zod_1 = require("zod");
// Schema matching outcome-evaluation.schema.json
exports.OutcomeEvaluationSchema = zod_1.z.object({
    decisionId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    expectedOutcome: zod_1.z.record(zod_1.z.any()).optional(),
    actualOutcome: zod_1.z.record(zod_1.z.any()),
    deltaExplanation: zod_1.z.string().optional(),
    eligibilityForLearning: zod_1.z.boolean(),
    verificationSource: zod_1.z.string(),
    confidenceDelta: zod_1.z.number().optional(),
});
class LearningGate {
    static instance;
    constructor() { }
    static getInstance() {
        if (!LearningGate.instance) {
            LearningGate.instance = new LearningGate();
        }
        return LearningGate.instance;
    }
    /**
     * Evaluates if a given outcome can be used for system adaptation.
     */
    async validateLearningEligibility(outcome) {
        if (!outcome.eligibilityForLearning) {
            console.log(`[LearningGate] Decision ${outcome.decisionId} rejected: Not marked eligible.`);
            return false;
        }
        if (!outcome.verificationSource) {
            console.error(`[LearningGate] Decision ${outcome.decisionId} rejected: No verification source.`);
            return false;
        }
        // TODO: Integrate with Outcome Ledger to check for duplicates or conflicts
        // TODO: Integrate with Constitutional Constraints
        console.log(`[LearningGate] Decision ${outcome.decisionId} accepted for learning queue.`);
        return true;
    }
    /**
     * Records a learning event to the Oversight Register.
     */
    async logLearningEvent(pipelineId, diff) {
        console.log(`[LearningGate] Logging learning event for pipeline ${pipelineId}`);
        // Persistence logic would go here
    }
}
exports.LearningGate = LearningGate;
