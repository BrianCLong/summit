"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuiltinTools = void 0;
const zod_1 = require("zod");
const hash_js_1 = require("../utils/hash.js");
const limitedString = (max) => zod_1.z.string().min(1).max(max);
const createBuiltinTools = (deps) => {
    const listCapabilities = {
        schema: {
            id: 'list_capabilities',
            name: 'List capabilities',
            description: 'Return lightweight capability and skill indexes.',
            tags: ['capabilities', 'discovery'],
            riskTier: 'low',
            requiredScopes: [],
            costHint: 'low',
            version: 'v1',
            inputSchema: zod_1.z.object({}).strict(),
            outputSchema: zod_1.z.object({
                tools: zod_1.z.array(zod_1.z.any()),
                skills: zod_1.z.array(zod_1.z.any()),
            }),
            inputJsonSchema: { type: 'object', properties: {}, additionalProperties: false },
            outputJsonSchema: {
                type: 'object',
                properties: {
                    tools: { type: 'array', items: { type: 'object' } },
                    skills: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        handler: async () => ({
            tools: deps.getToolIndex(),
            skills: deps.skillsRegistry.list(),
        }),
    };
    const getToolSchema = {
        schema: {
            id: 'get_tool_schema',
            name: 'Get tool schema',
            description: 'Return full tool schema on-demand.',
            tags: ['capabilities', 'schema'],
            riskTier: 'low',
            requiredScopes: [],
            costHint: 'low',
            version: 'v1',
            inputSchema: zod_1.z.object({ tool_id: limitedString(80) }).strict(),
            outputSchema: zod_1.z.object({
                schema: zod_1.z.any(),
                schemaHash: zod_1.z.string(),
            }),
            inputJsonSchema: {
                type: 'object',
                properties: { tool_id: { type: 'string', maxLength: 80 } },
                required: ['tool_id'],
                additionalProperties: false,
            },
            outputJsonSchema: {
                type: 'object',
                properties: {
                    schema: { type: 'object' },
                    schemaHash: { type: 'string' },
                },
            },
        },
        handler: async (input) => {
            const schema = deps.getToolSchema(input.tool_id);
            return {
                schema,
                schemaHash: (0, hash_js_1.hashJson)({
                    id: schema.id,
                    version: schema.version,
                    input: schema.inputJsonSchema,
                    output: schema.outputJsonSchema,
                }),
            };
        },
    };
    const getSkillToc = {
        schema: {
            id: 'get_skill_toc',
            name: 'Get skill TOC',
            description: 'Return TOC for a skill module.',
            tags: ['skills'],
            riskTier: 'low',
            requiredScopes: [],
            costHint: 'low',
            version: 'v1',
            inputSchema: zod_1.z.object({ skill_id: limitedString(80) }).strict(),
            outputSchema: zod_1.z.object({ skill: zod_1.z.any() }),
            inputJsonSchema: {
                type: 'object',
                properties: { skill_id: { type: 'string', maxLength: 80 } },
                required: ['skill_id'],
                additionalProperties: false,
            },
            outputJsonSchema: {
                type: 'object',
                properties: { skill: { type: 'object' } },
            },
        },
        handler: async (input) => ({
            skill: await deps.skillsRegistry.getSkill(input.skill_id),
        }),
    };
    const getSkillSection = {
        schema: {
            id: 'get_skill_section',
            name: 'Get skill section',
            description: 'Return a specific section from a skill module.',
            tags: ['skills'],
            riskTier: 'low',
            requiredScopes: [],
            costHint: 'low',
            version: 'v1',
            inputSchema: zod_1.z
                .object({
                skill_id: limitedString(80),
                section: limitedString(80),
            })
                .strict(),
            outputSchema: zod_1.z.object({ section: zod_1.z.string() }),
            inputJsonSchema: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', maxLength: 80 },
                    section: { type: 'string', maxLength: 80 },
                },
                required: ['skill_id', 'section'],
                additionalProperties: false,
            },
            outputJsonSchema: {
                type: 'object',
                properties: { section: { type: 'string' } },
            },
        },
        handler: async (input) => ({
            section: await deps.skillsRegistry.getSkillSection(input.skill_id, input.section),
        }),
    };
    const runQueryReadonly = {
        schema: {
            id: 'run_query_readonly',
            name: 'Run readonly query',
            description: 'Execute a safe, mocked read query path.',
            tags: ['query', 'readonly'],
            riskTier: 'medium',
            requiredScopes: ['mcp:query:readonly'],
            costHint: 'medium',
            version: 'v1',
            aliases: ['query.readonly'],
            inputSchema: zod_1.z
                .object({
                query: limitedString(256),
                limit: zod_1.z.number().int().min(1).max(50).default(10),
            })
                .strict(),
            outputSchema: zod_1.z.object({
                rows: zod_1.z.array(zod_1.z.object({
                    id: zod_1.z.string(),
                    label: zod_1.z.string(),
                    score: zod_1.z.number(),
                })),
            }),
            inputJsonSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', maxLength: 256 },
                    limit: { type: 'integer', minimum: 1, maximum: 50 },
                },
                required: ['query'],
                additionalProperties: false,
            },
            outputJsonSchema: {
                type: 'object',
                properties: {
                    rows: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                label: { type: 'string' },
                                score: { type: 'number' },
                            },
                            required: ['id', 'label', 'score'],
                        },
                    },
                },
            },
        },
        handler: async (input) => ({
            rows: Array.from({ length: input.limit }).map((_, index) => ({
                id: `row-${index + 1}`,
                label: `Result for ${input.query}`,
                score: Number((1 - index / input.limit).toFixed(2)),
            })),
        }),
    };
    const exportEvidence = {
        schema: {
            id: 'export_evidence',
            name: 'Export evidence bundle',
            description: 'Export the audit evidence bundle for a session.',
            tags: ['evidence', 'audit'],
            riskTier: 'medium',
            requiredScopes: ['mcp:evidence:read'],
            costHint: 'medium',
            version: 'v1',
            inputSchema: zod_1.z.object({ session_id: limitedString(64) }).strict(),
            outputSchema: zod_1.z.object({ bundle: zod_1.z.any() }),
            inputJsonSchema: {
                type: 'object',
                properties: { session_id: { type: 'string', maxLength: 64 } },
                required: ['session_id'],
                additionalProperties: false,
            },
            outputJsonSchema: {
                type: 'object',
                properties: { bundle: { type: 'object' } },
            },
        },
        handler: async (input, context) => ({
            bundle: deps.evidenceStore.exportBundle(input.session_id ?? context.sessionId),
        }),
    };
    return [
        listCapabilities,
        getToolSchema,
        getSkillToc,
        getSkillSection,
        runQueryReadonly,
        exportEvidence,
    ];
};
exports.createBuiltinTools = createBuiltinTools;
