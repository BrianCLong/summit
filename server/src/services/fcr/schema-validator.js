"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcrSchemaValidator = void 0;
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const Ajv = _2020_js_1.default.default || _2020_js_1.default;
const addFormats = ajv_formats_1.default.default || ajv_formats_1.default;
class FcrSchemaValidator {
    ajv = new Ajv({ allErrors: true, strict: true });
    constructor() {
        addFormats(this.ajv);
    }
    async validateSignals(signals) {
        const workspaceSchemaPath = path_1.default.resolve(process.cwd(), 'schemas', 'fcr', 'v1', 'fcr-signal.schema.json');
        const repoRootSchemaPath = path_1.default.resolve(process.cwd(), '..', 'schemas', 'fcr', 'v1', 'fcr-signal.schema.json');
        const schemaPath = await fs_1.promises
            .access(workspaceSchemaPath)
            .then(() => workspaceSchemaPath)
            .catch(() => repoRootSchemaPath);
        const schemaRaw = await fs_1.promises.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaRaw);
        const validate = this.ajv.compile(schema);
        const failures = [];
        for (const signal of signals) {
            const ok = validate(signal);
            if (!ok) {
                failures.push(...((validate.errors || []).map((error) => `${signal.entity_id}: ${error.instancePath} ${error.message}`)));
            }
        }
        return {
            ok: failures.length === 0,
            errors: failures,
        };
    }
}
exports.FcrSchemaValidator = FcrSchemaValidator;
