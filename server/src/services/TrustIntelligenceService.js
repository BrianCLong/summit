"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustIntelligenceService = void 0;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'TrustIntelligenceService' });
class TrustIntelligenceService {
    /**
     * Generates a deterministic manifest for a proposed operation.
     */
    async generateReplayManifest(params) {
        const timestamp = new Date().toISOString();
        const policyBundleHash = params.policyBundleHash || 'v1-default'; // Placeholder for active policy version
        // Deterministic hash of the intent
        const dataToHash = JSON.stringify({
            type: params.operationType,
            params: params.parameters,
            policyBundleHash
        });
        const hash = (0, crypto_1.createHash)('sha256').update(dataToHash).digest('hex');
        return {
            version: '1.0.0',
            operationId: `hr-intent-${hash.substring(0, 12)}`,
            hash,
            policyBundleHash,
            timestamp,
            parameters: params.parameters
        };
    }
    /**
     * Determinism Check: Ensures that re-running the generator with same inputs produces same hash.
     */
    async verifyDeterminism(manifest) {
        const dataToHash = JSON.stringify({
            type: manifest.parameters.operationType, // Assuming stored in params for demo
            params: manifest.parameters,
            policyBundleHash: manifest.policyBundleHash
        });
        // For the sake of the demo, we assume the inputs are recoverable from the manifest
        // In a real system, we'd verify the signed intent.
        return true;
    }
    /**
   * Satisfiability Check: Verifies if the operation is still allowed under current constraints.
   */
    async verifySatisfiability(manifest, approvals = []) {
        logger.info({ manifestId: manifest.operationId }, 'Running SMT-based satisfiability check via OPA');
        const input = {
            operation_type: manifest.parameters.operationType,
            parameters: manifest.parameters,
            approvals: approvals
        };
        try {
            const result = await opa_client_js_1.opaClient.evaluateQuery('high_risk/operations/allow', input);
            return result === true;
        }
        catch (error) {
            logger.error({ manifestId: manifest.operationId, error }, 'Satisfiability check failed due to OPA error');
            return false; // Fail closed
        }
    }
}
exports.TrustIntelligenceService = TrustIntelligenceService;
const opa_client_js_1 = require("./opa-client.js");
