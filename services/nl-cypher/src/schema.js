"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchema = loadSchema;
exports.normalizeSchema = normalizeSchema;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FALLBACK_PATH = path_1.default.resolve(__dirname, '../schema/fallback-schema.json');
const CONTRACT_SCHEMA = path_1.default.resolve(process.cwd(), 'contracts/query/schema.json');
function readSchemaFile(filePath) {
    try {
        const raw = fs_1.default.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        return undefined;
    }
}
function loadSchema() {
    const contractSchema = readSchemaFile(CONTRACT_SCHEMA);
    if (contractSchema) {
        return { schema: contractSchema, source: CONTRACT_SCHEMA };
    }
    const fallbackSchema = readSchemaFile(FALLBACK_PATH);
    if (!fallbackSchema) {
        throw new Error('Missing graph schema for NL→Cypher translation');
    }
    return { schema: fallbackSchema, source: FALLBACK_PATH };
}
function normalizeSchema(schema) {
    return {
        nodes: schema.nodes.map((node) => ({
            label: node.label,
            properties: node.properties.map((prop) => prop.toLowerCase()),
        })),
        relationships: schema.relationships.map((rel) => ({
            type: rel.type,
            from: rel.from,
            to: rel.to,
        })),
    };
}
