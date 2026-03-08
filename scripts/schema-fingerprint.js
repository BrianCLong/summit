"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSchemaFingerprint = computeSchemaFingerprint;
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const glob_1 = require("glob");
const schema_registry_js_1 = require("./schema-registry.js");
function stableHash(value) {
    return node_crypto_1.default.createHash('sha256').update(value, 'utf8').digest('hex');
}
async function hashFile(rootDir, filePath) {
    const absolutePath = node_path_1.default.resolve(rootDir, filePath);
    const buffer = await promises_1.default.readFile(absolutePath);
    return {
        path: filePath,
        hash: stableHash(buffer.toString('utf8')),
        bytes: buffer.byteLength
    };
}
async function collectFiles(rootDir, patterns) {
    const seen = new Set();
    for (const pattern of patterns) {
        const matches = await (0, glob_1.glob)(pattern, {
            cwd: rootDir,
            ignore: schema_registry_js_1.DEFAULT_IGNORES,
            posix: true
        });
        matches.forEach((match) => seen.add(match));
    }
    return Array.from(seen).sort();
}
async function fingerprintLayer(rootDir, registry) {
    const files = await collectFiles(rootDir, registry.schemaGlobs);
    const hashed = await Promise.all(files.map((filePath) => hashFile(rootDir, filePath)));
    const layerHash = stableHash(hashed
        .map((file) => `${file.path}:${file.hash}:${file.bytes}`)
        .join('|'));
    return { name: registry.name, files: hashed, layerHash };
}
async function computeSchemaFingerprint(rootDir = process.cwd()) {
    const registries = await (0, schema_registry_js_1.loadSchemaRegistries)();
    const layers = [];
    for (const registry of registries) {
        const layer = await fingerprintLayer(rootDir, registry);
        layers.push(layer);
    }
    const compositeHash = stableHash(layers
        .map((layer) => `${layer.name}:${layer.layerHash}`)
        .join('|'));
    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        layers,
        compositeHash
    };
}
function resolveOutputPath(tag) {
    const fileName = `${tag ?? 'latest'}.json`;
    return node_path_1.default.resolve(process.cwd(), 'schema-fingerprints', fileName);
}
function parseArgs(argv) {
    const options = {};
    for (let i = 0; i < argv.length; i += 1) {
        const current = argv[i];
        if (current === '--write' || current === '-w') {
            options.write = argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[i + 1] : 'latest';
        }
        if (current === '--pretty') {
            options.pretty = true;
        }
    }
    return options;
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const fingerprint = await computeSchemaFingerprint(process.cwd());
    if (args.write) {
        const outputPath = resolveOutputPath(args.write);
        await promises_1.default.mkdir(node_path_1.default.dirname(outputPath), { recursive: true });
        await promises_1.default.writeFile(outputPath, JSON.stringify(fingerprint, null, args.pretty ? 2 : 0));
        console.log(`Schema fingerprint written to ${node_path_1.default.relative(process.cwd(), outputPath)}`);
    }
    else {
        console.log(JSON.stringify(fingerprint, null, args.pretty ? 2 : 0));
    }
}
main().catch((error) => {
    console.error('Failed to compute schema fingerprint:', error);
    process.exitCode = 1;
});
