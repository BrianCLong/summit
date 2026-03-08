"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmPolicyStore = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const js_yaml_1 = __importDefault(require("js-yaml"));
const POLICY_PATH = (0, path_1.join)(process.cwd(), 'config', 'llm-policy.yaml');
class LlmPolicyStore {
    doc;
    constructor(policyOverride) {
        if (policyOverride) {
            this.validate(policyOverride);
            this.doc = policyOverride;
            return;
        }
        const fileContents = (0, fs_1.readFileSync)(POLICY_PATH, 'utf8');
        const parsed = js_yaml_1.default.load(fileContents);
        this.validate(parsed);
        this.doc = parsed;
    }
    getTenantPolicy(tenantId) {
        return this.doc.tenants[tenantId] || this.doc.tenants[this.doc.defaultTenant || 'default'];
    }
    getTaskPolicy(tenantId, task) {
        const tenant = this.getTenantPolicy(tenantId);
        if (!tenant)
            return null;
        const taskPolicy = tenant.tasks[task];
        if (!taskPolicy)
            return null;
        return { tenant, task: taskPolicy };
    }
    getClassPolicy(tenantId, task, modelClass) {
        const scoped = this.getTaskPolicy(tenantId, task);
        if (!scoped)
            return null;
        const classPolicy = scoped.task.modelClasses[modelClass];
        if (!classPolicy)
            return null;
        return { tenant: scoped.tenant, task: scoped.task, classPolicy };
    }
    validate(doc) {
        if (!doc || typeof doc !== 'object') {
            throw new Error('LLM policy is missing or malformed (root object missing)');
        }
        if (!doc.tenants || Object.keys(doc.tenants).length === 0) {
            throw new Error('LLM policy must define at least one tenant');
        }
        for (const [tenantId, tenantPolicy] of Object.entries(doc.tenants)) {
            if (!tenantPolicy.monthlyCost || tenantPolicy.monthlyCost.hard === undefined) {
                throw new Error(`Tenant ${tenantId} missing monthlyCost.hard`);
            }
            if (tenantPolicy.monthlyCost.soft === undefined) {
                throw new Error(`Tenant ${tenantId} missing monthlyCost.soft`);
            }
            if (tenantPolicy.monthlyCost.soft > tenantPolicy.monthlyCost.hard) {
                throw new Error(`Tenant ${tenantId} soft cap exceeds hard cap`);
            }
            if (!tenantPolicy.tasks || Object.keys(tenantPolicy.tasks).length === 0) {
                throw new Error(`Tenant ${tenantId} must declare at least one task policy`);
            }
            for (const [taskName, taskPolicy] of Object.entries(tenantPolicy.tasks)) {
                if (!taskPolicy?.modelClasses || Object.keys(taskPolicy.modelClasses).length === 0) {
                    throw new Error(`Task ${taskName} for tenant ${tenantId} must define modelClasses`);
                }
                Object.entries(taskPolicy.modelClasses).forEach(([className, classPolicy]) => {
                    if (!classPolicy || !classPolicy.allowedModels || classPolicy.allowedModels.length === 0) {
                        throw new Error(`Task ${taskName} / class ${className} for tenant ${tenantId} must allow at least one model`);
                    }
                });
            }
        }
    }
}
exports.LlmPolicyStore = LlmPolicyStore;
