"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.validateAgentDef = validateAgentDef;
exports.getAgentById = getAgentById;
exports.loadAgentRegistry = loadAgentRegistry;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const yaml_1 = require("yaml");
const zod_1 = require("zod");
function sortObjectKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortObjectKeys);
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return entries.reduce((acc, [key, entryValue]) => {
            acc[key] = sortObjectKeys(entryValue);
            return acc;
        }, {});
    }
    return value;
}
function stableStringify(value) {
    return JSON.stringify(sortObjectKeys(value), null, 2);
}
const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const AgentInputSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    required: zod_1.z.boolean(),
    description: zod_1.z.string().optional(),
})
    .strict();
const AgentOutputSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
})
    .strict();
const AgentDefSchema = zod_1.z
    .object({
    id: zod_1.z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().regex(semverRegex),
    description: zod_1.z.string().min(1),
    role: zod_1.z.enum(['orchestrator', 'specialist', 'critic', 'executor']),
    inputs: zod_1.z.array(AgentInputSchema),
    outputs: zod_1.z.array(AgentOutputSchema),
    sop_refs: zod_1.z.array(zod_1.z.string()).optional(),
    allowed_tools: zod_1.z.array(zod_1.z.string()).default([]),
    data_access: zod_1.z.enum(['public', 'internal', 'restricted']).default('internal'),
    policies: zod_1.z.array(zod_1.z.string()).optional(),
    evals: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    owner: zod_1.z.string().optional(),
})
    .strict();
function validateAgentDef(value) {
    return AgentDefSchema.parse(value);
}
function getAgentById(agents, id) {
    return agents.find((agent) => agent.id === id);
}
function formatZodErrors(file, error) {
    return error.issues.map((issue) => ({
        file,
        path: issue.path.length > 0 ? issue.path.join('.') : undefined,
        message: issue.message,
    }));
}
function isYamlFile(entry) {
    return entry.toLowerCase().endsWith('.yaml') || entry.toLowerCase().endsWith('.yml');
}
async function resolveRegistryFiles(dirOrGlob) {
    if ((0, glob_1.hasMagic)(dirOrGlob)) {
        return (await (0, glob_1.glob)(dirOrGlob, { nodir: true })).sort();
    }
    const resolvedPath = path_1.default.resolve(dirOrGlob);
    try {
        const stat = await promises_1.default.stat(resolvedPath);
        if (stat.isDirectory()) {
            const entries = await promises_1.default.readdir(resolvedPath);
            return entries
                .filter(isYamlFile)
                .map((entry) => path_1.default.join(resolvedPath, entry))
                .sort();
        }
        if (stat.isFile()) {
            return [resolvedPath];
        }
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Unable to access registry path: ${error.message}`);
        }
    }
    return [];
}
async function loadAgentRegistry(dirOrGlob) {
    const errors = [];
    const agents = [];
    let files = [];
    try {
        files = await resolveRegistryFiles(dirOrGlob);
    }
    catch (error) {
        errors.push({
            file: dirOrGlob,
            message: error instanceof Error ? error.message : 'Unable to resolve registry path.',
        });
        return { agents: [], errors };
    }
    if (files.length === 0) {
        errors.push({
            file: dirOrGlob,
            message: 'No registry files found.',
        });
        return { agents: [], errors };
    }
    for (const file of files) {
        try {
            const raw = await promises_1.default.readFile(file, 'utf-8');
            const parsed = (0, yaml_1.parse)(raw);
            const agent = validateAgentDef(parsed);
            agents.push({ agent, file });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                errors.push(...formatZodErrors(file, error));
            }
            else if (error instanceof Error) {
                errors.push({
                    file,
                    message: `YAML parse failed: ${error.message}`,
                });
            }
            else {
                errors.push({ file, message: 'Unknown error while parsing registry file.' });
            }
        }
    }
    const uniqueAgents = [];
    const seen = new Map();
    for (const entry of agents) {
        const existing = seen.get(entry.agent.id);
        if (existing) {
            errors.push({
                file: entry.file,
                path: 'id',
                message: `Duplicate agent id "${entry.agent.id}" also defined in ${existing}.`,
            });
            continue;
        }
        seen.set(entry.agent.id, entry.file);
        uniqueAgents.push(entry.agent);
    }
    uniqueAgents.sort((a, b) => a.id.localeCompare(b.id));
    return { agents: uniqueAgents, errors };
}
