"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IGNORES = exports.REGISTRY_FILES = void 0;
exports.loadSchemaRegistries = loadSchemaRegistries;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
exports.REGISTRY_FILES = [
    node_path_1.default.resolve(process.cwd(), 'migrations/sql/registry.json'),
    node_path_1.default.resolve(process.cwd(), 'migrations/graph/registry.json'),
    node_path_1.default.resolve(process.cwd(), 'migrations/vector/registry.json'),
    node_path_1.default.resolve(process.cwd(), 'migrations/json/registry.json')
];
exports.DEFAULT_IGNORES = [
    '**/node_modules/**',
    '**/.turbo/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**'
];
async function readRegistry(filePath) {
    const raw = await promises_1.default.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.name) {
        parsed.name = node_path_1.default.basename(node_path_1.default.dirname(filePath));
    }
    if (!parsed.schemaGlobs || !parsed.migrationGlobs) {
        throw new Error(`Registry ${filePath} must define schemaGlobs and migrationGlobs`);
    }
    return {
        name: parsed.name,
        description: parsed.description ?? '',
        schemaGlobs: parsed.schemaGlobs,
        migrationGlobs: parsed.migrationGlobs
    };
}
async function loadSchemaRegistries() {
    const registries = [];
    for (const filePath of exports.REGISTRY_FILES) {
        try {
            const registry = await readRegistry(filePath);
            registries.push(registry);
        }
        catch (error) {
            throw new Error(`Unable to read schema registry at ${filePath}: ${String(error)}`);
        }
    }
    return registries;
}
