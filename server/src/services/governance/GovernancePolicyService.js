"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernancePolicyService = void 0;
const uuid_1 = require("uuid");
class GovernancePolicyService {
    static instance;
    policies = new Map();
    constructor() { }
    static getInstance() {
        if (!GovernancePolicyService.instance) {
            GovernancePolicyService.instance = new GovernancePolicyService();
        }
        return GovernancePolicyService.instance;
    }
    registerPolicy(policy) {
        const newPolicy = {
            ...policy,
            id: (0, uuid_1.v4)(),
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.policies.set(newPolicy.id, newPolicy);
        // In a real system, we would persist this to DB and likely sync to OPA
        return newPolicy;
    }
    getPolicy(id) {
        return this.policies.get(id);
    }
    getAllPolicies() {
        return Array.from(this.policies.values());
    }
    updatePolicy(id, updates) {
        const policy = this.policies.get(id);
        if (!policy)
            throw new Error(`Policy ${id} not found`);
        const updatedPolicy = {
            ...policy,
            ...updates,
            version: policy.version + 1,
            updatedAt: new Date(),
        };
        this.policies.set(id, updatedPolicy);
        return updatedPolicy;
    }
}
exports.GovernancePolicyService = GovernancePolicyService;
