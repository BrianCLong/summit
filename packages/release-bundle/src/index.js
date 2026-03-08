"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceStatementSchema = exports.ReleaseManifestSchema = exports.BundleIndexSchema = exports.ReleaseStatusSchema = void 0;
exports.parseReleaseStatus = parseReleaseStatus;
exports.parseBundleIndex = parseBundleIndex;
exports.parseReleaseManifest = parseReleaseManifest;
exports.parseProvenance = parseProvenance;
exports.checkCompatibility = checkCompatibility;
exports.loadBundleFromDir = loadBundleFromDir;
const zod_1 = require("zod");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
// --- Types & Schemas ---
exports.ReleaseStatusSchema = zod_1.z.enum(['draft', 'ready', 'deprecated', 'archived']);
exports.BundleIndexSchema = zod_1.z.object({
    schemaVersion: zod_1.z.string(),
    entries: zod_1.z.record(zod_1.z.string(), zod_1.z.string()), // path -> hash
});
exports.ReleaseManifestSchema = zod_1.z.object({
    schemaVersion: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    majorVersion: zod_1.z.number().optional(),
    artifacts: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.ProvenanceStatementSchema = zod_1.z.object({
    schemaVersion: zod_1.z.string().optional(),
    _type: zod_1.z.string().optional(), // Common in in-toto
    subject: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        digest: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    })).optional(),
    predicateType: zod_1.z.string().optional(),
    predicate: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
}).passthrough(); // Allow other fields for flexibility
// --- Parsers ---
function parseReleaseStatus(json) {
    // Supports raw string or { status: "..." } object
    const schema = zod_1.z.union([
        exports.ReleaseStatusSchema,
        zod_1.z.object({ status: exports.ReleaseStatusSchema }).transform(o => o.status)
    ]);
    return schema.parse(json);
}
function parseBundleIndex(json) {
    return exports.BundleIndexSchema.parse(json);
}
function parseReleaseManifest(json) {
    return exports.ReleaseManifestSchema.parse(json);
}
function parseProvenance(json) {
    return exports.ProvenanceStatementSchema.parse(json);
}
// --- Logic ---
function checkCompatibility(artifacts, supportedMajor = 1) {
    if (artifacts.manifest) {
        let major = artifacts.manifest.majorVersion;
        // If explicit majorVersion is missing, try to infer from version string
        if (major === undefined && artifacts.manifest.version) {
            const match = artifacts.manifest.version.match(/^v?(\d+)/);
            if (match) {
                major = parseInt(match[1], 10);
            }
        }
        if (major !== undefined && major !== supportedMajor) {
            return {
                compatible: false,
                reason: `Artifact major version ${major} does not match supported version ${supportedMajor}`
            };
        }
    }
    return { compatible: true };
}
async function loadBundleFromDir(dir) {
    const result = {};
    const loadJSON = async (filename, parser) => {
        try {
            const content = await promises_1.default.readFile(node_path_1.default.join(dir, filename), 'utf-8');
            return parser(JSON.parse(content));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return undefined;
            // Wrap error to provide context
            throw new Error(`Failed to parse ${filename} in ${dir}: ${error.message}`);
        }
    };
    // Try standard filenames and common variations
    result.status = await loadJSON('status.json', parseReleaseStatus)
        ?? await loadJSON('release-status.json', parseReleaseStatus);
    result.index = await loadJSON('index.json', parseBundleIndex)
        ?? await loadJSON('bundle-index.json', parseBundleIndex);
    result.manifest = await loadJSON('manifest.json', parseReleaseManifest)
        ?? await loadJSON('release-manifest.json', parseReleaseManifest);
    result.provenance = await loadJSON('provenance.json', parseProvenance)
        ?? await loadJSON('provenance-statement.json', parseProvenance);
    return result;
}
