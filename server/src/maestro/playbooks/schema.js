"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOK_SCHEMA = exports.PLAYBOOK_STEP_SCHEMA = void 0;
const dsl_schema_js_1 = require("../dsl-schema.js");
exports.PLAYBOOK_STEP_SCHEMA = {
    $id: 'https://intelgraph.dev/schemas/playbook-step.json',
    type: 'object',
    required: ['id', 'kind', 'action'],
    additionalProperties: false,
    properties: {
        id: { type: 'string', minLength: 1 },
        kind: { type: 'string', enum: ['action'] },
        name: { type: 'string' },
        action: { type: 'string', minLength: 1 },
        input: { type: 'object', additionalProperties: true },
        retry: {
            type: 'object',
            additionalProperties: false,
            required: ['maxAttempts'],
            properties: {
                maxAttempts: { type: 'integer', minimum: 1, maximum: 25 },
                backoffSeconds: { type: 'integer', minimum: 0 },
            },
        },
    },
};
exports.PLAYBOOK_SCHEMA = {
    $id: 'https://intelgraph.dev/schemas/playbook.json',
    type: 'object',
    required: ['id', 'name', 'steps'],
    additionalProperties: false,
    properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        steps: {
            type: 'array',
            minItems: 1,
            items: { $ref: 'https://intelgraph.dev/schemas/playbook-step.json' },
        },
        schedule: dsl_schema_js_1.MAESTRO_DSL_SCHEMA.properties.schedule,
    },
};
