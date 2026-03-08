"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const policy_1 = require("../src/policy");
const config_1 = require("../src/config");
const audit_1 = require("../src/audit");
const goldenCases = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures', 'golden-policy-cases.json'), 'utf-8'));
describe('policy reasoner', () => {
    beforeEach(() => {
        (0, audit_1.resetAuditLog)();
    });
    it('evaluates golden policy fixtures', async () => {
        expect.assertions(goldenCases.length * 2);
        for (const testCase of goldenCases) {
            const decision = await (0, policy_1.authorize)(testCase.input);
            expect(decision.allowed).toBe(testCase.expected.allowed);
            expect(decision.policyId).toBe(testCase.expected.policyId);
        }
    });
    it('produces stable deny reason snapshots', async () => {
        const denies = [];
        for (const testCase of goldenCases) {
            const decision = await (0, policy_1.authorize)(testCase.input);
            if (!decision.allowed) {
                denies.push(`${decision.policyId}: ${decision.reason}`);
            }
        }
        expect(denies).toMatchSnapshot();
    });
    it('generates field level effects for dry-run', async () => {
        const treatmentRecord = {
            subject: {
                name: 'Alice Smith',
                ssn: '123-45-6789',
                birthDate: '1988-07-14',
                financialAccount: '99887766',
            },
        };
        const treatmentResult = await (0, policy_1.dryRun)({
            user: {
                sub: 'alice',
                tenantId: 'tenantA',
                roles: ['reader'],
                clearance: 'confidential',
                status: 'active',
            },
            resource: {
                path: '/protected/resource',
                tenantId: 'tenantA',
                attributes: { needToKnow: 'reader' },
            },
            action: 'read',
            purpose: 'treatment',
            authority: 'hipaa',
        }, treatmentRecord);
        expect(treatmentResult.fields['subject.name']).toEqual({
            before: 'Alice Smith',
            after: 'AS',
            effect: 'mask',
        });
        expect(treatmentResult.fields['subject.birthDate']).toEqual({
            before: '1988-07-14',
            after: '1988',
            effect: 'mask',
        });
        expect(treatmentResult.fields['subject.financialAccount']).toEqual({
            before: '99887766',
            after: '[REDACTED]',
            effect: 'redact',
        });
        const overrideRecord = {
            subject: {
                name: 'Carol White',
                ssn: '111-22-3333',
                accountNumber: '9988776655443322',
                region: 'Northwest',
            },
        };
        const overrideResult = await (0, policy_1.dryRun)({
            user: {
                sub: 'carol',
                tenantId: 'tenantA',
                roles: ['compliance'],
                clearance: 'confidential',
                status: 'active',
            },
            resource: {
                path: '/protected/investigation',
                tenantId: 'tenantB',
            },
            action: 'read',
            purpose: 'investigation',
            authority: 'fraud-investigation',
        }, overrideRecord);
        expect(overrideResult.fields['subject.accountNumber']).toEqual({
            before: '9988776655443322',
            after: '************3322',
            effect: 'mask',
        });
        expect(overrideResult.fields['subject.region']).toEqual({
            before: 'Northwest',
            after: 'MASKED',
            effect: 'mask',
        });
        expect(overrideResult.fields['subject.ssn']).toEqual({
            before: '111-22-3333',
            after: '[REDACTED]',
            effect: 'redact',
        });
    });
    it('is resilient to missing or extra claims', async () => {
        const baseInput = {
            user: {
                sub: 'alice',
                tenantId: 'tenantA',
                roles: ['reader'],
                clearance: 'confidential',
                status: 'active',
                extraClaim: 'value',
            },
            resource: {
                path: '/protected/resource',
                tenantId: 'tenantA',
            },
            action: 'read',
            purpose: 'treatment',
            authority: 'hipaa',
        };
        const variants = [
            baseInput,
            {
                ...baseInput,
                user: { ...baseInput.user, tenantId: undefined },
            },
            {
                ...baseInput,
                user: { ...baseInput.user, roles: undefined },
            },
            {
                ...baseInput,
                resource: { ...baseInput.resource, tenantId: undefined },
            },
            {
                ...baseInput,
                user: { ...baseInput.user, clearance: 'topsecret' },
            },
        ];
        for (const variant of variants) {
            const decision = await (0, policy_1.authorize)(variant);
            expect(typeof decision.allowed).toBe('boolean');
        }
    });
    it('fails fast when the policy bundle drifts', () => {
        const checksum = (0, policy_1.bundleChecksum)();
        expect(checksum).toBe('1f1b71360a024c2f1f100103244a5b90509b65c79c64440bdee5e628897cf6f2');
    });
    it('exposes bundle metadata for regression assertions', () => {
        const bundle = (0, policy_1.getPolicyBundle)();
        expect(bundle.metadata.version).toBe('2024.11.15');
        expect(bundle.rules.length).toBeGreaterThan(0);
    });
    it('allows traffic when policy reasoner is disabled', async () => {
        (0, config_1.setFeatureOverrides)({ policyReasoner: false });
        const decision = await (0, policy_1.authorize)({
            user: {
                sub: 'alice',
                tenantId: 'tenantA',
                roles: ['reader'],
                clearance: 'confidential',
                status: 'active',
            },
            resource: {
                path: '/protected/resource',
                tenantId: 'tenantB',
            },
            action: 'read',
            purpose: '',
            authority: '',
        });
        expect(decision.allowed).toBe(true);
        expect(decision.policyId).toBe('policy.disabled');
        (0, config_1.setFeatureOverrides)({ policyReasoner: true });
    });
});
