"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const schemaPath = path_1.default.join(process.cwd(), 'schemas/jules-provenance.schema.json');
const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, 'utf8'));
(0, node_test_1.describe)('Jules Provenance Schema', () => {
    const ajv = new ajv_1.default();
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    (0, node_test_1.it)('valid provenance block', () => {
        const validData = {
            provenance: {
                generator: 'Jules',
                timestamp: new Date().toISOString(),
                seed_commit: 'abc1234',
                requirements_summary: 'Some summary',
                verification: 'passed'
            }
        };
        const valid = validate(validData);
        if (!valid)
            console.error(validate.errors);
        node_assert_1.default.strictEqual(valid, true);
    });
    (0, node_test_1.it)('invalid generator', () => {
        const invalidData = {
            provenance: {
                generator: 'Other',
                timestamp: new Date().toISOString(),
                seed_commit: 'abc1234',
                verification: 'passed'
            }
        };
        node_assert_1.default.strictEqual(validate(invalidData), false);
    });
    (0, node_test_1.it)('invalid verification status', () => {
        const invalidData = {
            provenance: {
                generator: 'Jules',
                timestamp: new Date().toISOString(),
                seed_commit: 'abc1234',
                verification: 'unknown'
            }
        };
        node_assert_1.default.strictEqual(validate(invalidData), false);
    });
});
(0, node_test_1.describe)('Jules Artifacts Existence', () => {
    (0, node_test_1.it)('CI template exists', () => {
        const templatePath = path_1.default.join(process.cwd(), 'templates/jules/ci-workflow.yml');
        node_assert_1.default.strictEqual(fs_1.default.existsSync(templatePath), true);
    });
    (0, node_test_1.it)('OPA policy exists', () => {
        const policyPath = path_1.default.join(process.cwd(), 'policy/jules/pr_invariants.rego');
        node_assert_1.default.strictEqual(fs_1.default.existsSync(policyPath), true);
    });
});
