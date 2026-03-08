"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readManifestFile = readManifestFile;
exports.validateManifest = validateManifest;
exports.writeDeterministicJson = writeDeterministicJson;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const hash_js_1 = require("./hash.js");
const schema_js_1 = require("./schema.js");
const stable_json_js_1 = require("./stable-json.js");
async function readManifestFile(manifestPath) {
    const raw = await promises_1.default.readFile(manifestPath, 'utf-8');
    const ext = node_path_1.default.extname(manifestPath).toLowerCase();
    const data = ext === '.yaml' || ext === '.yml'
        ? yaml_1.default.parse(raw)
        : JSON.parse(raw);
    return { raw, data };
}
async function validateManifest(manifestPath) {
    const { raw, data } = await readManifestFile(manifestPath);
    const parsed = schema_js_1.manifestSchema.safeParse(data);
    const digest = (0, hash_js_1.hashBytes)(Buffer.from(raw));
    if (parsed.success) {
        return {
            ok: true,
            input_path: manifestPath,
            digest_sha256: digest,
            schema_version: parsed.data.schema_version,
            errors: [],
        };
    }
    return {
        ok: false,
        input_path: manifestPath,
        digest_sha256: digest,
        schema_version: null,
        errors: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.') || 'root',
            message: issue.message,
        })),
    };
}
async function writeDeterministicJson(outputPath, data) {
    const serialized = (0, stable_json_js_1.stableStringify)(data);
    await promises_1.default.writeFile(outputPath, `${serialized}\n`, 'utf-8');
}
