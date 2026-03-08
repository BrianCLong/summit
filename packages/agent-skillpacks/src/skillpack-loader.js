"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateDistilledTokens = exports.summarizeInjectedTools = exports.cacheToolSchema = exports.injectSkillpackTools = exports.expandToolSchema = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const minimatch_1 = require("minimatch");
const schema_distiller_js_1 = require("./schema-distiller.js");
const policy_gate_js_1 = require("./policy-gate.js");
const skillpack_discovery_js_1 = require("./skillpack-discovery.js");
const shard_router_js_1 = require("./shard-router.js");
const DEFAULT_CACHE_DIR = node_path_1.default.join('.summit', 'mcp-cache');
const sortStrings = (values) => [...values].sort();
const mergeMcpConfigs = (localConfig, globalConfig) => {
    if (!localConfig && !globalConfig) {
        return null;
    }
    if (!globalConfig) {
        return localConfig;
    }
    if (!localConfig) {
        return globalConfig;
    }
    return {
        servers: {
            ...localConfig.servers,
            ...globalConfig.servers,
        },
    };
};
const resolveToolPatterns = (availableTools, patterns) => {
    const resolved = new Set();
    patterns.forEach((pattern) => {
        if (pattern.includes('*')) {
            availableTools
                .filter((tool) => (0, minimatch_1.minimatch)(tool, pattern, { matchBase: true }))
                .forEach((tool) => resolved.add(tool));
        }
        else {
            resolved.add(pattern);
        }
    });
    return sortStrings([...resolved]);
};
const readFullSchema = async (cacheDir, serverName, toolName) => {
    const schemaPath = node_path_1.default.join(cacheDir, serverName, `${toolName}.json`);
    try {
        const content = await promises_1.default.readFile(schemaPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
const mapToolPatterns = (serverConfig, shard) => {
    if (serverConfig.shards?.[shard]?.length) {
        return serverConfig.shards[shard];
    }
    if (serverConfig.shards?.default?.length) {
        return serverConfig.shards.default;
    }
    if (serverConfig.includeTools?.length) {
        return serverConfig.includeTools;
    }
    throw new Error(`Server config missing tool selection for shard: ${shard}`);
};
const gatherShardNames = (config) => {
    const shardNames = new Set();
    Object.values(config.servers).forEach((server) => {
        if (server.shards) {
            Object.keys(server.shards).forEach((name) => shardNames.add(name));
        }
        else {
            shardNames.add('default');
        }
    });
    return Object.fromEntries([...shardNames].map((name) => [name, []]));
};
const expandToolSchema = async (options) => {
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    const schema = await readFullSchema(cacheDir, options.serverName, options.toolName);
    if (!schema) {
        throw new Error(`Full schema not found for ${options.serverName}:${options.toolName}`);
    }
    return schema;
};
exports.expandToolSchema = expandToolSchema;
const injectSkillpackTools = async (options) => {
    const manifest = await (0, skillpack_discovery_js_1.loadSkillpackManifest)(options.skillpackDir);
    const localMcpConfig = await (0, skillpack_discovery_js_1.loadMcpConfig)(options.skillpackDir);
    const mergedMcpConfig = mergeMcpConfigs(localMcpConfig, options.globalMcpConfig);
    if (!mergedMcpConfig) {
        throw new Error('Skillpack missing mcp.json and no global MCP config provided.');
    }
    const localPolicy = await (0, skillpack_discovery_js_1.loadPolicyConfig)(options.skillpackDir);
    const effectivePolicy = (0, policy_gate_js_1.mergePolicies)(options.policy ?? { defaultBehavior: 'deny' }, localPolicy ?? undefined);
    const shardSelection = (0, shard_router_js_1.selectShard)(gatherShardNames(mergedMcpConfig), options.shardContext);
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    const environment = options.environment ?? 'dev';
    const toolsInjected = [];
    const injectionRecords = [];
    const sortedServers = sortStrings(Object.keys(mergedMcpConfig.servers));
    for (const serverName of sortedServers) {
        const serverConfig = mergedMcpConfig.servers[serverName];
        const available = options.availableTools?.[serverName] ?? [];
        const patterns = mapToolPatterns(serverConfig, shardSelection.shard);
        if (patterns.length === 0) {
            throw new Error(`Tool selection empty for ${serverName}:${shardSelection.shard}`);
        }
        if (patterns.some((pattern) => pattern.includes('*')) && available.length === 0) {
            throw new Error(`Available tools missing for glob resolution on ${serverName}.`);
        }
        const selectedTools = resolveToolPatterns(available, patterns);
        for (const toolName of selectedTools) {
            const decision = (0, policy_gate_js_1.evaluateToolAccess)({
                toolName,
                policy: effectivePolicy,
                environment,
            });
            const fullSchema = await readFullSchema(cacheDir, serverName, toolName);
            const safetyNotes = [
                `Policy: ${decision.reason}`,
                `Environment: ${environment}`,
            ];
            const distilled = (0, schema_distiller_js_1.distillToolSchema)(fullSchema ?? { name: toolName, description: 'Schema cached pending.' }, safetyNotes, fullSchema ? 'cache' : 'placeholder');
            const justification = {
                expectedUtility: `Requested by shard ${shardSelection.shard}.`,
                tokenCost: distilled.tokenEstimate,
                alternatives: ['Built-in toolset', 'Deferred schema expansion'],
                planStepRef: `skillpack:${manifest.name}:${shardSelection.shard}`,
            };
            injectionRecords.push({
                toolName,
                serverName,
                mode: decision.allowed ? 'distilled' : 'distilled',
                tokenEstimate: distilled.tokenEstimate,
                decision,
                justification,
            });
            if (decision.allowed) {
                toolsInjected.push(distilled);
            }
        }
    }
    const totalTokens = injectionRecords.reduce((sum, record) => sum + record.tokenEstimate, 0);
    const report = {
        skillpack: {
            name: manifest.name,
            path: options.skillpackDir,
        },
        shard: shardSelection,
        context: {
            ...options.shardContext,
            triggerContext: options.triggerContext,
        },
        tools: injectionRecords,
        totals: {
            toolsConsidered: injectionRecords.length,
            toolsInjected: toolsInjected.length,
            estimatedTokens: totalTokens,
        },
        policy: {
            environment,
            breakGlassUsed: injectionRecords.some((record) => Boolean(record.decision.waiverId)),
        },
        generatedAt: new Date().toISOString(),
    };
    return { manifest, distilledTools: toolsInjected, report };
};
exports.injectSkillpackTools = injectSkillpackTools;
const cacheToolSchema = async (options) => {
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    const serverDir = node_path_1.default.join(cacheDir, options.serverName);
    await promises_1.default.mkdir(serverDir, { recursive: true });
    const schemaPath = node_path_1.default.join(serverDir, `${options.toolName}.json`);
    await promises_1.default.writeFile(schemaPath, JSON.stringify(options.schema, null, 2));
};
exports.cacheToolSchema = cacheToolSchema;
const summarizeInjectedTools = (tools) => tools.map((tool) => `${tool.name} (${tool.tokenEstimate} tokens)`);
exports.summarizeInjectedTools = summarizeInjectedTools;
const estimateDistilledTokens = (tools) => (0, schema_distiller_js_1.estimateTokenFootprint)(tools.map((tool) => tool.tokenEstimate));
exports.estimateDistilledTokens = estimateDistilledTokens;
