"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const validate_semantics_1 = require("../../summit/agents/policy/validate-semantics");
const skillRegistry = {
    'release.approve': {
        name: 'release.approve',
        risk: 'high',
        scopes: ['repo.write'],
    },
    'builder.secret.read': {
        name: 'builder.secret.read',
        risk: 'medium',
        scopes: ['secrets.read'],
    },
};
(0, node_test_1.default)('semantic validator catches missing approvals for high-risk prod allow', () => {
    const policy = {
        default: 'deny',
        rules: [
            {
                id: 'prod-high-risk-no-approval',
                effect: 'allow',
                env: ['prod'],
                agent_role: 'governance',
                skills: ['release.approve'],
                scopes: ['repo.write'],
            },
        ],
    };
    const result = (0, validate_semantics_1.validatePolicySemantics)(policy, skillRegistry);
    strict_1.default.equal(result.ok, false);
    strict_1.default.ok(result.errors.some((error) => error.code === 'PROD_HIGH_RISK_APPROVALS'));
});
(0, node_test_1.default)('semantic validator denies builder with secrets scope in prod', () => {
    const policy = {
        default: 'deny',
        rules: [
            {
                id: 'builder-secret-prod',
                effect: 'allow',
                env: ['prod'],
                agent_role: 'builder',
                skills: ['builder.secret.read'],
                scopes: ['secrets.read'],
                annotations: {
                    approvals: ['governance'],
                },
            },
        ],
    };
    const result = (0, validate_semantics_1.validatePolicySemantics)(policy, skillRegistry);
    strict_1.default.equal(result.ok, false);
    strict_1.default.ok(result.errors.some((error) => error.code === 'BUILDER_PROD_SECRETS_SCOPE'));
});
