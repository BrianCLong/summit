"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_ts_1 = require("../src/index.ts");
const schemaPath = `${process.cwd()}/config/authority-schema.yaml`;
(0, vitest_1.describe)('authority schema validation', () => {
    (0, vitest_1.it)('accepts the canonical authority schema and exposes structured data', () => {
        const result = (0, index_ts_1.loadAuthoritySchemaFromFile)(schemaPath);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(result.schema?.metadata.namespace).toBe('authority');
        (0, vitest_1.expect)(result.schema?.role_templates.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.schema?.authorities[0]?.bindings[0]?.template).toBe('role:viewer');
    });
    (0, vitest_1.it)('flags missing metadata and invalid attribute definitions', () => {
        const invalidSchema = {
            schema_version: '',
            metadata: { namespace: '', owner: '' },
            attribute_catalog: {
                principal: [{ key: 'id', type: 'unsupported' }],
            },
            condition_language: { syntax: '' },
            role_templates: [],
            authorities: [],
        };
        const result = (0, index_ts_1.validateAuthoritySchema)(invalidSchema);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors).toEqual(vitest_1.expect.arrayContaining([
            'schema_version must be a non-empty string',
            'metadata.namespace must be a non-empty string',
            'metadata.owner must be a non-empty string',
            'condition_language.syntax must be a non-empty string',
            'role_templates must include at least one template',
            'authorities must include at least one authority',
        ]));
        (0, vitest_1.expect)(result.errors.some((error) => error.includes('attribute_catalog.principal[0].type'))).toBe(true);
    });
    (0, vitest_1.it)('requires bindings and ABAC controls to use supported shapes', () => {
        const malformed = {
            schema_version: '1.0.0',
            metadata: { namespace: 'authority', owner: 'platform-auth' },
            attribute_catalog: {},
            condition_language: { syntax: 'cel' },
            role_templates: [
                {
                    id: 'role:viewer',
                    description: 'test',
                    grants: [
                        {
                            effect: 'allow',
                            actions: ['read'],
                            resources: ['*'],
                        },
                    ],
                },
            ],
            authorities: [
                {
                    id: 'authority:test',
                    description: 'invalid binding',
                    decision_strategy: 'permit-overrides',
                    inherits: [],
                    bindings: [
                        {
                            template: 'role:viewer',
                            with: {},
                            subjects: [],
                            conditions: [{ expression: '' }],
                        },
                    ],
                    abac_controls: [
                        {
                            expression: 'context.environment == "prod"',
                            effect: 'invalid',
                            when: [''],
                        },
                    ],
                },
            ],
        };
        const result = (0, index_ts_1.validateAuthoritySchema)(malformed);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors).toEqual(vitest_1.expect.arrayContaining([
            'authorities[0].bindings[0].subjects must include at least one subject',
            'authorities[0].bindings[0].conditions[0].expression must be a non-empty string',
            'authorities[0].abac_controls[0].effect must be allow or deny',
        ]));
    });
});
