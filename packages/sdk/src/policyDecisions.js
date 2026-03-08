"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyDecisionsClient = void 0;
const policy_decision_schema_json_1 = __importDefault(require("../../../schemas/policy-decision.schema.json"));
const _policyDecisionSchema = policy_decision_schema_json_1.default;
class PolicyDecisionsClient {
    client;
    basePath = '/api/policy/decisions';
    constructor(client) {
        this.client = client;
    }
    /**
     * Request an authoritative policy decision for the provided input payload.
     */
    async requestDecision(request) {
        const response = await this.client.post(this.basePath, {
            input: request.input,
            policy: {
                package: request.policyPackage,
                version: request.policyVersion,
                rule: request.rule,
            },
            metadata: request.metadata,
        });
        return response.data;
    }
}
exports.PolicyDecisionsClient = PolicyDecisionsClient;
