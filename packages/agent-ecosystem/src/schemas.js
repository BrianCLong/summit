"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEvidenceBundleSchema = exports.ResourceSchema = exports.ResourceTypeSchema = exports.SignalsSchema = exports.CapabilitiesSchema = void 0;
const zod_1 = require("zod");
const defaultCapabilities = {
    tool_use: false,
    memory: false,
    planning: false,
    orchestration: false,
    evals: false,
    safety: false,
    observability: false,
    multi_agent: false,
    sandboxing: false,
};
exports.CapabilitiesSchema = zod_1.z.object({
    tool_use: zod_1.z.boolean().default(false),
    memory: zod_1.z.boolean().default(false),
    planning: zod_1.z.boolean().default(false),
    orchestration: zod_1.z.boolean().default(false),
    evals: zod_1.z.boolean().default(false),
    safety: zod_1.z.boolean().default(false),
    observability: zod_1.z.boolean().default(false),
    multi_agent: zod_1.z.boolean().default(false),
    sandboxing: zod_1.z.boolean().default(false),
});
const defaultSignals = {
    active_community: false,
};
exports.SignalsSchema = zod_1.z.object({
    github_stars: zod_1.z.number().optional(),
    last_commit: zod_1.z.string().optional(), // Allow loose date string for now
    license: zod_1.z.string().optional(),
    active_community: zod_1.z.boolean().default(false),
    docs_quality: zod_1.z.enum(['High', 'Medium', 'Low', 'None']).optional(),
});
exports.ResourceTypeSchema = zod_1.z.enum([
    'Framework',
    'Tool',
    'Platform',
    'Model',
    'Guide',
    'Benchmark',
    'Community'
]);
exports.ResourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(), // Optional on input, required on output
    name: zod_1.z.string(),
    type: exports.ResourceTypeSchema,
    url: zod_1.z.string().url(),
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    maturity: zod_1.z.enum(['Experimental', 'Alpha', 'Beta', 'Production', 'Deprecated']).default('Experimental'),
    capabilities: exports.CapabilitiesSchema.default(defaultCapabilities),
    signals: exports.SignalsSchema.default(defaultSignals),
});
exports.AgentEvidenceBundleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    resource_id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    // The snapshot of the resource at this point in time
    primaryArtifact: exports.ResourceSchema,
    provenance: zod_1.z.object({
        source: zod_1.z.string(), // e.g. "manual-entry", "github-crawler"
        method: zod_1.z.string(), // "seed", "scrape"
        actor: zod_1.z.string().default("summit-agent-indexer"),
    }),
    verification: zod_1.z.object({
        status: zod_1.z.enum(['unverified', 'verified', 'failed']).default('unverified'),
        tests_run: zod_1.z.array(zod_1.z.string()).default([]),
        results: zod_1.z.record(zod_1.z.any()).default({}),
    }),
    claims: zod_1.z.array(zod_1.z.object({
        claim: zod_1.z.string(),
        evidence: zod_1.z.string().optional(),
        confidence: zod_1.z.number().min(0).max(1).default(0.5),
    })).default([]),
});
