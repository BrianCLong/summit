"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new ajv_1.default({ allErrors: true, allowUnionTypes: true });
(0, ajv_formats_1.default)(ajv);
const schema = JSON.parse(node_fs_1.default.readFileSync('workflow.schema.json', 'utf8'));
const yaml_1 = require("yaml");
function loadYaml(file) {
    // Minimal YAML loader stub; replace with 'yaml' pkg if desired
    return (0, yaml_1.parse)(node_fs_1.default.readFileSync(file, 'utf8'));
}
(0, vitest_1.describe)('Workflow manifest schema', () => {
    (0, vitest_1.it)('validates example manifest', () => {
        const manifest = loadYaml('../examples/workflows/ingest-enrich-handoff.yaml');
        const validate = ajv.compile(schema);
        const ok = validate(manifest);
        if (!ok) {
            // validate.errors
        }
        (0, vitest_1.expect)(ok).toBe(true);
    });
    (0, vitest_1.it)('fails on missing policy fields', () => {
        const m = {
            apiVersion: 'maestro/v1',
            kind: 'Workflow',
            metadata: { name: 'x', version: '1.0.0' },
            spec: { tasks: [] },
        };
        const validate = ajv.compile(schema);
        (0, vitest_1.expect)(validate(m)).toBe(false);
    });
});
