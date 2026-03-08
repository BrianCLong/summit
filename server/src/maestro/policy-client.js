"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyClient = exports.PolicyClient = void 0;
class PolicyClient {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PolicyClient.instance) {
            PolicyClient.instance = new PolicyClient();
        }
        return PolicyClient.instance;
    }
    async evaluate(input) {
        // In a real scenario, this would POST to OPA sidecar
        console.log('[PolicyClient] Evaluating:', JSON.stringify(input));
        // Simulate simple check
        if (!input.user || !input.user.tenantId) {
            return { allowed: false, reason: 'No user context' };
        }
        // Default allow for prototype if roles exist
        if (input.user.roles && input.user.roles.length > 0) {
            return { allowed: true };
        }
        return { allowed: false, reason: 'No roles found' };
    }
}
exports.PolicyClient = PolicyClient;
exports.policyClient = PolicyClient.getInstance();
