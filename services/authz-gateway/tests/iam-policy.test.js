"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function evaluatePolicy(input) {
    const messages = [];
    if (input.resource.type === 'aws_iam_policy') {
        (input.resource.statement ?? []).forEach((statement) => {
            if (statement.effect === 'Allow' && (statement.action ?? []).includes('*')) {
                messages.push(`Deny wildcard IAM actions on ${input.resource.name}`);
            }
            if (statement.effect === 'Allow' && (statement.resource ?? []).includes('*')) {
                messages.push(`Deny wildcard resources on ${input.resource.name}`);
            }
        });
        if (!input.resource.tags?.env) {
            messages.push(`IAM policy ${input.resource.name} missing required tag env`);
        }
    }
    if (input.resource.public === true) {
        messages.push(`Resource ${input.resource.name} cannot be public`);
    }
    return messages;
}
describe('IAM guardrails', () => {
    it('blocks wildcard and public exposure', () => {
        const sampleInput = {
            resource: {
                type: 'aws_iam_policy',
                name: 'pilot-ci-role',
                public: true,
                tags: {},
                statement: [
                    { effect: 'Allow', action: ['*'], resource: ['arn:aws:s3:::bucket/*'] },
                    { effect: 'Allow', action: ['s3:GetObject'], resource: ['*'] },
                ],
            },
        };
        const denies = evaluatePolicy(sampleInput);
        expect(denies).toContain('Deny wildcard IAM actions on pilot-ci-role');
        expect(denies).toContain('Deny wildcard resources on pilot-ci-role');
        expect(denies).toContain('Resource pilot-ci-role cannot be public');
        expect(denies).toContain('IAM policy pilot-ci-role missing required tag env');
    });
    it('passes minimally scoped role', () => {
        const sampleInput = {
            resource: {
                type: 'aws_iam_policy',
                name: 'pilot-ci-role',
                public: false,
                tags: { env: 'stage' },
                statement: [{ effect: 'Allow', action: ['sts:AssumeRole'], resource: ['arn:aws:iam::123:role/pilot'] }],
            },
        };
        expect(evaluatePolicy(sampleInput)).toHaveLength(0);
    });
    it('ships rego file alongside evaluation harness', () => {
        const regoPath = path_1.default.join(__dirname, '..', 'policy', 'phase1', 'iam.rego');
        expect(fs_1.default.existsSync(regoPath)).toBe(true);
    });
});
