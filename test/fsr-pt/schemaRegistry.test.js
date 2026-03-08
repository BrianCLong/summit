"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../src/fsr-pt/index.js");
describe('Federated Schema Registry with Policy Tags', () => {
    const baseSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
            status: { type: 'string' },
        },
        required: ['id'],
    };
    const baseTags = {
        sensitivity: 'internal',
        residency: 'us-central',
        retentionClass: 'standard',
    };
    it('registers schemas and computes compatibility with deterministic flags', () => {
        const registry = new index_js_1.SchemaRegistry();
        const first = registry.registerSchema('alpha', 'orders', '1.0.0', baseSchema, baseTags);
        expect(first.compatibility.compatible).toBe(true);
        expect(first.diff.tagDiff.summary).toContain('Initial policy tags established');
        const relaxedSchema = {
            type: 'object',
            properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                note: { type: 'string' },
            },
            required: ['id'],
        };
        const relaxedTags = {
            ...baseTags,
            retentionClass: 'extended',
        };
        const second = registry.registerSchema('alpha', 'orders', '1.1.0', relaxedSchema, relaxedTags);
        expect(second.compatibility.compatible).toBe(true);
        expect(second.compatibility.nonBreakingChanges).toEqual(['Property "note" was added.']);
        expect(second.diff.tagDiff.summary).toContain('Policy tag updates detected');
        expect(second.diff.impactSummary).toEqual([
            'INFO: Property "note" was added.',
            'TAG: Policy tag updates detected:',
            'TAG: - retentionClass: standard -> extended (Impact: Retention window extended; confirm archival and deletion workflows.)',
        ]);
        const breakingSchema = {
            type: 'object',
            properties: {
                id: { type: 'string' },
            },
            required: ['id'],
        };
        const hardenedTags = {
            sensitivity: 'confidential',
            residency: 'us-central',
            retentionClass: 'extended',
        };
        const third = registry.registerSchema('alpha', 'orders', '2.0.0', breakingSchema, hardenedTags);
        expect(third.isBreakingChange).toBe(true);
        expect(third.compatibility.breakingChanges).toEqual(['Property "note" was removed.', 'Property "status" was removed.']);
        expect(third.diff.tagDiff.summary).toContain('Policy tag updates detected');
        expect(third.diff.impactSummary[0]).toBe('BREAKING: Property "note" was removed.');
        expect(third.diff.impactSummary[1]).toBe('BREAKING: Property "status" was removed.');
    });
    it('produces clear tag diff impact summaries', () => {
        const previous = {
            sensitivity: 'internal',
            residency: 'eu-west',
            retentionClass: 'standard',
        };
        const current = {
            sensitivity: 'restricted',
            residency: 'eu-west',
            retentionClass: 'indefinite',
        };
        const diff = (0, index_js_1.diffPolicyTags)(previous, current);
        expect(diff.hasChanges).toBe(true);
        expect(diff.summary).toContain('Policy tag updates detected');
        expect(diff.changes).toEqual([
            {
                tag: 'sensitivity',
                previous: 'internal',
                current: 'restricted',
                impact: 'Escalate data handling and access controls.',
            },
            {
                tag: 'retentionClass',
                previous: 'standard',
                current: 'indefinite',
                impact: 'Retention window extended; confirm archival and deletion workflows.',
            },
        ]);
    });
    it('generates client bindings with embedded policy metadata', () => {
        const registry = new index_js_1.SchemaRegistry();
        registry.registerSchema('silo-x', 'profile', '1.0.0', baseSchema, baseTags);
        const bindings = registry.generateClientBindings('silo-x', 'profile', '1.0.0');
        expect(bindings.typescript).toContain('Policy tags: sensitivity=');
        expect(bindings.typescript).toContain('getProfileV1_0_0PolicyTags');
        expect(bindings.python).toContain('POLICY_TAGS');
        expect(bindings.python).toContain('policyTags');
    });
});
