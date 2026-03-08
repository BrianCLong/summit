"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../types/index.js");
describe('Type Schemas', () => {
    describe('ConfigValueTypeSchema', () => {
        it('should accept valid config value types', () => {
            expect(index_js_1.ConfigValueTypeSchema.parse('boolean')).toBe('boolean');
            expect(index_js_1.ConfigValueTypeSchema.parse('integer')).toBe('integer');
            expect(index_js_1.ConfigValueTypeSchema.parse('float')).toBe('float');
            expect(index_js_1.ConfigValueTypeSchema.parse('string')).toBe('string');
            expect(index_js_1.ConfigValueTypeSchema.parse('json')).toBe('json');
        });
        it('should reject invalid config value types', () => {
            expect(() => index_js_1.ConfigValueTypeSchema.parse('invalid')).toThrow();
        });
    });
    describe('HierarchyLevelSchema', () => {
        it('should accept valid hierarchy levels', () => {
            expect(index_js_1.HierarchyLevelSchema.parse('global')).toBe('global');
            expect(index_js_1.HierarchyLevelSchema.parse('environment')).toBe('environment');
            expect(index_js_1.HierarchyLevelSchema.parse('tenant')).toBe('tenant');
            expect(index_js_1.HierarchyLevelSchema.parse('user')).toBe('user');
        });
        it('should reject invalid hierarchy levels', () => {
            expect(() => index_js_1.HierarchyLevelSchema.parse('invalid')).toThrow();
        });
    });
    describe('CreateConfigItemInputSchema', () => {
        it('should validate valid input', () => {
            const input = {
                key: 'test.config',
                value: true,
                valueType: 'boolean',
                level: 'global',
            };
            const result = index_js_1.CreateConfigItemInputSchema.parse(input);
            expect(result.key).toBe('test.config');
            expect(result.value).toBe(true);
            expect(result.isSecret).toBe(false); // default
        });
        it('should apply defaults', () => {
            const input = {
                key: 'test.config',
                value: 'hello',
                valueType: 'string',
                level: 'tenant',
            };
            const result = index_js_1.CreateConfigItemInputSchema.parse(input);
            expect(result.environment).toBeNull();
            expect(result.tenantId).toBeNull();
            expect(result.userId).toBeNull();
            expect(result.isSecret).toBe(false);
            expect(result.isGovernanceProtected).toBe(false);
        });
        it('should reject empty key', () => {
            const input = {
                key: '',
                value: true,
                valueType: 'boolean',
                level: 'global',
            };
            expect(() => index_js_1.CreateConfigItemInputSchema.parse(input)).toThrow();
        });
        it('should reject key exceeding max length', () => {
            const input = {
                key: 'a'.repeat(256),
                value: true,
                valueType: 'boolean',
                level: 'global',
            };
            expect(() => index_js_1.CreateConfigItemInputSchema.parse(input)).toThrow();
        });
    });
    describe('EvaluationContextSchema', () => {
        it('should validate valid context', () => {
            const context = {
                userId: 'user-123',
                tenantId: 'tenant-1',
                environment: 'production',
                attributes: { plan: 'premium' },
            };
            const result = index_js_1.EvaluationContextSchema.parse(context);
            expect(result.userId).toBe('user-123');
            expect(result.attributes).toEqual({ plan: 'premium' });
        });
        it('should require userId', () => {
            const context = {
                tenantId: 'tenant-1',
            };
            expect(() => index_js_1.EvaluationContextSchema.parse(context)).toThrow();
        });
        it('should apply default empty attributes', () => {
            const context = {
                userId: 'user-123',
            };
            const result = index_js_1.EvaluationContextSchema.parse(context);
            expect(result.attributes).toEqual({});
        });
    });
    describe('SegmentOperatorSchema', () => {
        const validOperators = [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'in',
            'not_in',
            'greater_than',
            'greater_than_or_equals',
            'less_than',
            'less_than_or_equals',
            'regex',
            'semver_equals',
            'semver_greater_than',
            'semver_less_than',
        ];
        it('should accept all valid operators', () => {
            for (const op of validOperators) {
                expect(index_js_1.SegmentOperatorSchema.parse(op)).toBe(op);
            }
        });
        it('should reject invalid operators', () => {
            expect(() => index_js_1.SegmentOperatorSchema.parse('invalid_op')).toThrow();
        });
    });
    describe('ExperimentStatusSchema', () => {
        it('should accept valid statuses', () => {
            expect(index_js_1.ExperimentStatusSchema.parse('draft')).toBe('draft');
            expect(index_js_1.ExperimentStatusSchema.parse('running')).toBe('running');
            expect(index_js_1.ExperimentStatusSchema.parse('paused')).toBe('paused');
            expect(index_js_1.ExperimentStatusSchema.parse('completed')).toBe('completed');
            expect(index_js_1.ExperimentStatusSchema.parse('archived')).toBe('archived');
        });
        it('should reject invalid statuses', () => {
            expect(() => index_js_1.ExperimentStatusSchema.parse('invalid')).toThrow();
        });
    });
    describe('Complex Schema Validation', () => {
        it('should validate a complete feature flag', () => {
            const flag = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                key: 'new-feature',
                name: 'New Feature',
                description: 'A new feature flag',
                tenantId: null,
                enabled: true,
                defaultValue: false,
                valueType: 'boolean',
                targetingRules: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        segmentId: '550e8400-e29b-41d4-a716-446655440002',
                        inlineConditions: null,
                        rolloutPercentage: 50,
                        value: true,
                        priority: 1,
                    },
                ],
                allowlist: ['user-1', 'user-2'],
                blocklist: [],
                isGovernanceProtected: false,
                staleAfterDays: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
                updatedBy: 'admin',
            };
            const result = index_js_1.FeatureFlagSchema.parse(flag);
            expect(result.key).toBe('new-feature');
            expect(result.targetingRules).toHaveLength(1);
        });
        it('should validate segment with complex rules', () => {
            const segment = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Premium Users',
                description: 'Users with premium plan',
                tenantId: 'tenant-1',
                rules: [
                    {
                        conditions: [
                            { attribute: 'plan', operator: 'equals', value: 'premium' },
                            { attribute: 'age', operator: 'greater_than', value: 18 },
                        ],
                    },
                    {
                        conditions: [
                            { attribute: 'roles', operator: 'contains', value: 'admin' },
                        ],
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
                updatedBy: 'admin',
            };
            const result = index_js_1.SegmentSchema.parse(segment);
            expect(result.rules).toHaveLength(2);
            expect(result.rules[0].conditions).toHaveLength(2);
        });
        it('should validate experiment with variants', () => {
            const experiment = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                key: 'button-color-test',
                name: 'Button Color Test',
                description: 'Testing button colors',
                tenantId: null,
                status: 'running',
                variants: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        name: 'control',
                        description: 'Original blue button',
                        weight: 50,
                        value: { color: 'blue' },
                        isControl: true,
                    },
                    {
                        id: '550e8400-e29b-41d4-a716-446655440002',
                        name: 'treatment',
                        description: 'New green button',
                        weight: 50,
                        value: { color: 'green' },
                        isControl: false,
                    },
                ],
                targetSegmentId: null,
                rolloutPercentage: 100,
                allowlist: [],
                blocklist: [],
                isGovernanceProtected: false,
                requiresApproval: false,
                approvedBy: null,
                approvedAt: null,
                startedAt: new Date(),
                endedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
                updatedBy: 'admin',
            };
            const result = index_js_1.ExperimentSchema.parse(experiment);
            expect(result.variants).toHaveLength(2);
            expect(result.status).toBe('running');
        });
        it('should reject experiment with less than 2 variants', () => {
            const experiment = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                key: 'invalid-experiment',
                name: 'Invalid',
                description: null,
                tenantId: null,
                status: 'draft',
                variants: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        name: 'only',
                        description: null,
                        weight: 100,
                        value: {},
                        isControl: true,
                    },
                ],
                targetSegmentId: null,
                rolloutPercentage: 100,
                allowlist: [],
                blocklist: [],
                isGovernanceProtected: false,
                requiresApproval: false,
                approvedBy: null,
                approvedAt: null,
                startedAt: null,
                endedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
                updatedBy: 'admin',
            };
            expect(() => index_js_1.ExperimentSchema.parse(experiment)).toThrow();
        });
    });
});
