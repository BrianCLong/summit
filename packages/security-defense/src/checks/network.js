"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNetworkChecks = void 0;
const yaml_1 = __importDefault(require("yaml"));
const fs_utils_js_1 = require("../fs-utils.js");
const networkPolicyPatterns = ['k8s/network/**/*.{yml,yaml}', '**/networkpolicy*.{yml,yaml}'];
const isDefaultDeny = (policy) => {
    const types = policy?.spec?.policyTypes ?? [];
    const hasIngressDeny = types.includes('Ingress') && (!policy.spec.ingress || policy.spec.ingress.length === 0);
    const hasEgressDeny = types.includes('Egress') && (!policy.spec.egress || policy.spec.egress.length === 0);
    return hasIngressDeny && hasEgressDeny;
};
const runNetworkChecks = (root) => {
    const results = [];
    const files = (0, fs_utils_js_1.findFiles)(root, networkPolicyPatterns);
    if (files.length === 0) {
        results.push({
            epic: 'Epic 6',
            requirement: 'Network policy coverage',
            status: 'fail',
            message: 'No NetworkPolicy resources found. Default-deny policies are required per namespace.',
            remediation: 'Add default-deny ingress and egress NetworkPolicies with explicit allowlists.',
        });
        return results;
    }
    let defaultDenyCount = 0;
    files.forEach((file) => {
        const content = (0, fs_utils_js_1.loadFile)(file);
        if (!content)
            return;
        yaml_1.default.parseAllDocuments(content)
            .map((doc) => doc.toJSON())
            .filter((doc) => doc?.kind === 'NetworkPolicy')
            .forEach((policy) => {
            if (isDefaultDeny(policy)) {
                defaultDenyCount += 1;
            }
        });
    });
    if (defaultDenyCount === 0) {
        results.push({
            epic: 'Epic 6',
            requirement: 'Default-deny posture',
            status: 'fail',
            message: 'No default-deny ingress+egress policies detected.',
            remediation: 'Add NetworkPolicies that deny by default and allow only required flows.',
        });
    }
    else {
        results.push({
            epic: 'Epic 6',
            requirement: 'Default-deny posture',
            status: 'pass',
            message: `Detected ${defaultDenyCount} default-deny NetworkPolicy resources.`,
        });
    }
    return results;
};
exports.runNetworkChecks = runNetworkChecks;
