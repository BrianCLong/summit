"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCapabilityRegistry = loadCapabilityRegistry;
exports.resolveCapabilityByMcp = resolveCapabilityByMcp;
exports.resolveCapabilityByHttp = resolveCapabilityByHttp;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function resolveRepoRoot(startDir) {
    let current = startDir;
    while (current !== node_path_1.default.dirname(current)) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(current, 'pnpm-workspace.yaml'))) {
            return current;
        }
        current = node_path_1.default.dirname(current);
    }
    return startDir;
}
function defaultRegistryPath() {
    const repoRoot = resolveRepoRoot(process.cwd());
    return node_path_1.default.join(repoRoot, 'capability-fabric', 'artifacts', 'capability-registry.json');
}
let registryCache = null;
function loadCapabilityRegistry() {
    const registryPath = process.env.CAPABILITY_REGISTRY_PATH || defaultRegistryPath();
    const stats = node_fs_1.default.statSync(registryPath);
    if (registryCache && registryCache.path === registryPath && registryCache.mtimeMs === stats.mtimeMs) {
        return registryCache.registry;
    }
    const raw = node_fs_1.default.readFileSync(registryPath, 'utf8');
    const parsed = JSON.parse(raw);
    registryCache = {
        path: registryPath,
        mtimeMs: stats.mtimeMs,
        registry: parsed,
    };
    return parsed;
}
function resolveCapabilityByMcp(registry, server, tool) {
    const candidates = registry.capabilities.filter((capability) => capability.matchers?.some((matcher) => matcher.type === 'mcp_tool'));
    for (const capability of candidates) {
        const match = capability.matchers?.find((matcher) => {
            if (matcher.type !== 'mcp_tool')
                return false;
            const serverMatch = matcher.server === '*' || matcher.server === server;
            const toolMatch = matcher.tool === '*' || matcher.tool === tool;
            return serverMatch && toolMatch;
        });
        if (match) {
            return capability;
        }
    }
    return null;
}
function resolveCapabilityByHttp(registry, method, pathValue) {
    const candidates = registry.capabilities.filter((capability) => capability.matchers?.some((matcher) => matcher.type === 'http_endpoint'));
    for (const capability of candidates) {
        const match = capability.matchers?.find((matcher) => {
            if (matcher.type !== 'http_endpoint')
                return false;
            const methodMatch = !matcher.method || matcher.method.toLowerCase() === method.toLowerCase();
            const pathMatch = matcher.path === pathValue;
            return methodMatch && pathMatch;
        });
        if (match) {
            return capability;
        }
    }
    return null;
}
