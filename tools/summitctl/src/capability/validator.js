"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAgainstSchema = validateAgainstSchema;
exports.resolveSchemaPath = resolveSchemaPath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ajv_1 = __importDefault(require("ajv"));
function validateAgainstSchema(registry, schemaPath) {
    if (!node_fs_1.default.existsSync(schemaPath)) {
        return [`Schema not found: ${schemaPath}`];
    }
    const schema = JSON.parse(node_fs_1.default.readFileSync(schemaPath, 'utf8'));
    const ajv = new ajv_1.default({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const valid = validate(registry);
    if (valid) {
        return [];
    }
    return (validate.errors || []).map((err) => `${err.instancePath || 'registry'} ${err.message || 'invalid'}`.trim());
}
function resolveSchemaPath(repoRoot) {
    return node_path_1.default.join(repoRoot, 'capability-fabric', 'schemas', 'capability.schema.json');
}
