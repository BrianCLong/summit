"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanOpenApi = scanOpenApi;
exports.scanServiceCatalog = scanServiceCatalog;
exports.scanCapabilityAnnotations = scanCapabilityAnnotations;
exports.scanGatewayConfigs = scanGatewayConfigs;
exports.scanInventory = scanInventory;
exports.resolveRepoRoot = resolveRepoRoot;
exports.ensureDirectory = ensureDirectory;
exports.writeJson = writeJson;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const DEFAULT_IGNORES = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    'artifacts',
]);
const OPENAPI_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
function isDirectory(dirPath) {
    return node_fs_1.default.statSync(dirPath).isDirectory();
}
function walk(dir, ignores = DEFAULT_IGNORES) {
    const entries = node_fs_1.default.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (ignores.has(entry.name)) {
            continue;
        }
        const entryPath = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(entryPath, ignores));
        }
        else {
            files.push(entryPath);
        }
    }
    return files;
}
function parseOpenApi(filePath) {
    const raw = node_fs_1.default.readFileSync(filePath, 'utf8');
    if (!raw.includes('openapi') && !raw.includes('swagger')) {
        return null;
    }
    try {
        if (filePath.endsWith('.json')) {
            return JSON.parse(raw);
        }
        return yaml_1.default.parse(raw);
    }
    catch {
        return null;
    }
}
function scanOpenApi(rootDir) {
    const files = walk(rootDir)
        .filter((file) => OPENAPI_EXTENSIONS.has(node_path_1.default.extname(file)))
        .sort();
    const inventory = [];
    for (const filePath of files) {
        const parsed = parseOpenApi(filePath);
        if (!parsed) {
            continue;
        }
        const name = parsed.info?.title ?? node_path_1.default.basename(filePath);
        const version = parsed.info?.version ?? undefined;
        const servers = Array.isArray(parsed.servers)
            ? parsed.servers.map((server) => server.url).filter(Boolean)
            : undefined;
        const operations = parsed.paths
            ? Object.keys(parsed.paths).reduce((count, route) => {
                const ops = parsed.paths[route];
                return count + (ops ? Object.keys(ops).length : 0);
            }, 0)
            : undefined;
        const capability_id = parsed['x-capability-id'] || parsed['x-capability'];
        inventory.push({
            id: node_path_1.default.relative(rootDir, filePath),
            name,
            type: 'openapi',
            source: filePath,
            version,
            servers,
            capability_id,
            operations,
        });
    }
    return inventory.sort((a, b) => a.id.localeCompare(b.id));
}
function scanServiceCatalog(rootDir) {
    const files = walk(rootDir).filter((file) => node_path_1.default.basename(file) === 'catalog-info.yaml');
    return files
        .map((filePath) => {
        const parsed = yaml_1.default.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
        return {
            id: node_path_1.default.relative(rootDir, filePath),
            name: parsed?.metadata?.name ?? node_path_1.default.basename(filePath),
            type: 'service-manifest',
            source: filePath,
        };
    })
        .sort((a, b) => a.id.localeCompare(b.id));
}
function scanCapabilityAnnotations(rootDir) {
    const files = walk(rootDir)
        .filter((file) => ['.ts', '.js', '.py'].includes(node_path_1.default.extname(file)))
        .sort();
    const entries = [];
    for (const filePath of files) {
        const raw = node_fs_1.default.readFileSync(filePath, 'utf8');
        const matches = raw.matchAll(/@capability\(([^)]+)\)/g);
        for (const match of matches) {
            const capabilityId = match[1].replace(/['"`]/g, '').trim();
            entries.push({
                id: `${node_path_1.default.relative(rootDir, filePath)}:${capabilityId}`,
                name: capabilityId,
                type: 'annotation',
                source: filePath,
                capability_id: capabilityId,
            });
        }
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
}
function scanGatewayConfigs(rootDir) {
    const files = walk(rootDir)
        .filter((file) => file.includes('gateway') && OPENAPI_EXTENSIONS.has(node_path_1.default.extname(file)))
        .sort();
    const entries = [];
    for (const filePath of files) {
        const parsed = parseOpenApi(filePath);
        if (!parsed) {
            continue;
        }
        entries.push({
            id: node_path_1.default.relative(rootDir, filePath),
            name: parsed.info?.title ?? node_path_1.default.basename(filePath),
            type: 'gateway-config',
            source: filePath,
            version: parsed.info?.version,
        });
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
}
function scanInventory(rootDir) {
    return [
        ...scanOpenApi(rootDir),
        ...scanServiceCatalog(rootDir),
        ...scanGatewayConfigs(rootDir),
        ...scanCapabilityAnnotations(rootDir),
    ].sort((a, b) => a.id.localeCompare(b.id));
}
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
function ensureDirectory(dir) {
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function writeJson(filePath, payload) {
    node_fs_1.default.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
