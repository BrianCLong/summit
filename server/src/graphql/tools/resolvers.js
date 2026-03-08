"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsResolvers = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const yaml_1 = __importDefault(require("yaml"));
const Ajv = ajv_1.default.default || ajv_1.default;
const addFormats = ajv_formats_1.default.default || ajv_formats_1.default;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = {
    type: 'object',
    required: ['version', 'graph'],
    properties: {
        version: { type: 'string' },
        policy: {
            type: 'object',
            properties: {
                slaMs: { type: 'integer', minimum: 1000 },
                budgetUsd: { type: 'number', minimum: 0 },
            },
        },
        graph: {
            type: 'object',
            required: ['nodes', 'edges'],
            properties: {
                nodes: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: ['id', 'type'],
                        properties: {
                            id: { type: 'string', minLength: 1 },
                            type: { type: 'string' },
                            retries: { type: 'integer', minimum: 0, maximum: 5 },
                            timeoutMs: { type: 'integer', minimum: 1000, maximum: 900000 },
                        },
                    },
                },
                edges: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['from', 'to'],
                        properties: { from: { type: 'string' }, to: { type: 'string' } },
                    },
                },
            },
        },
    },
};
const validate = ajv.compile(schema);
exports.toolsResolvers = {
    Query: {
        lintRunbook: async (_, { yaml }) => {
            const rb = yaml_1.default.parse(yaml);
            const issues = [];
            if (!validate(rb)) {
                for (const e of validate.errors || [])
                    issues.push({
                        rule: 'SCHEMA',
                        severity: 'error',
                        path: e.instancePath || '/',
                        message: e.message || 'invalid',
                    });
            }
            const ids = new Set();
            for (const n of rb.graph?.nodes || []) {
                if (ids.has(n.id))
                    issues.push({
                        rule: 'NODES_UNIQUE',
                        severity: 'error',
                        path: `/graph/nodes/${n.id}`,
                        message: 'duplicate id',
                    });
                ids.add(n.id);
                if ((n.retries ?? 0) > 0 && !n.timeoutMs)
                    issues.push({
                        rule: 'RETRY_REQUIRES_TIMEOUT',
                        severity: 'warn',
                        path: `/graph/nodes/${n.id}`,
                        message: 'retries without timeout',
                        quickFix: 'set timeoutMs: 60000',
                    });
            }
            if (rb.policy?.residency &&
                rb.meta?.region &&
                !String(rb.meta.region)
                    .toLowerCase()
                    .startsWith(String(rb.policy.residency).toLowerCase()))
                issues.push({
                    rule: 'RESIDENCY_CONFLICT',
                    severity: 'error',
                    path: '/meta/region',
                    message: `region ${rb.meta.region} conflicts with residency ${rb.policy.residency}`,
                });
            return issues;
        },
        simulatePolicy: async (_, { yaml }) => {
            const rb = yaml_1.default.parse(yaml);
            // Stub: mark sensitivity:restricted as require-human, others allow
            const out = [];
            for (const n of rb.graph?.nodes || []) {
                const labels = Array.isArray(n.policyLabels)
                    ? n.policyLabels
                    : [];
                if (labels.some((l) => String(l).includes('sensitivity:restricted')))
                    out.push({
                        stepId: n.id,
                        decision: 'require-human',
                        reason: 'restricted sensitivity',
                    });
                else
                    out.push({ stepId: n.id, decision: 'allow', reason: '' });
            }
            return out;
        },
    },
};
