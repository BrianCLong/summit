"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbacLocalEvaluator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readJson(filePath) {
    return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
}
function canonicalize(input) {
    return JSON.stringify(input, Object.keys(input).sort());
}
class AbacLocalEvaluator {
    manifest;
    data;
    constructor(bundleDir = path_1.default.resolve(__dirname, '..', 'policy', 'abac', 'v1')) {
        const resolved = fs_1.default.existsSync(bundleDir)
            ? bundleDir
            : path_1.default.resolve(process.cwd(), 'services', 'authz-gateway', 'policy', 'abac', 'v1');
        this.manifest = readJson(path_1.default.join(resolved, 'manifest.json'));
        this.data = readJson(path_1.default.join(resolved, 'data.json'));
    }
    evaluate(input) {
        const decision = this.decide(input);
        const inputsHash = crypto_1.default
            .createHash('sha256')
            .update(canonicalize(input))
            .digest('hex');
        const decisionId = crypto_1.default.randomUUID();
        return {
            version: this.manifest.policy_version,
            decision: {
                ...decision,
                decisionId,
                policyVersion: this.manifest.policy_version,
                inputsHash,
            },
        };
    }
    decide(input) {
        const subjectRegion = (input.subject.region || input.subject.residency || '').toLowerCase();
        const resourceResidency = (input.resource.residency || '').toLowerCase();
        const allowedGlobal = new Set(this.data.residency.allowed_global.map((r) => r.toLowerCase()));
        if (!subjectRegion ||
            (!allowedGlobal.has(resourceResidency) && subjectRegion !== resourceResidency)) {
            return { allowed: false, reason: 'residency_mismatch', obligations: [] };
        }
        const requiredClearance = this.data.classification.levels[input.resource.classification];
        const haveClearance = this.data.classification.levels[input.subject.clearance];
        if (requiredClearance === undefined ||
            haveClearance === undefined ||
            haveClearance < requiredClearance) {
            return { allowed: false, reason: 'insufficient_clearance', obligations: [] };
        }
        if (input.resource.owner &&
            input.subject.org &&
            input.resource.owner.toLowerCase() !== input.subject.org.toLowerCase()) {
            return { allowed: false, reason: 'ownership_mismatch', obligations: [] };
        }
        const actionKey = (input.action || '').toLowerCase();
        const actionRoles = this.data.actions[actionKey]?.roles || [];
        const normalizedRoles = new Set([...(input.subject.roles || []), input.subject.role]
            .filter((r) => !!r)
            .map((role) => role.toLowerCase()));
        const hasRole = actionRoles.some((role) => normalizedRoles.has(role.toLowerCase()));
        if (!hasRole) {
            return { allowed: false, reason: 'role_mismatch', obligations: [] };
        }
        const needsStepUp = this.data.step_up.actions
            .map((action) => action.toLowerCase())
            .includes(actionKey);
        const strengthOrder = { loa1: 1, loa2: 2, loa3: 3 };
        const current = strengthOrder[(input.subject.auth_strength || '').toLowerCase()];
        const required = strengthOrder[this.data.step_up.min_auth_strength.toLowerCase()];
        if (needsStepUp && current !== undefined && required !== undefined && current < required) {
            return {
                allowed: false,
                reason: 'step_up_required',
                obligations: [this.data.step_up.obligation],
            };
        }
        return { allowed: true, reason: 'allow', obligations: [] };
    }
}
exports.AbacLocalEvaluator = AbacLocalEvaluator;
