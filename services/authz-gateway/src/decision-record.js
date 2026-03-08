"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichDecision = enrichDecision;
const crypto_1 = __importDefault(require("crypto"));
function enrichDecision(decision, input, policyVersion = process.env.POLICY_BUNDLE_VERSION || 'abac.v1.0.0') {
    const decisionId = crypto_1.default.randomUUID();
    const inputsHash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');
    return { ...decision, decisionId, inputsHash, policyVersion };
}
