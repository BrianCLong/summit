"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ allErrors: true });
const schema = JSON.parse(node_fs_1.default.readFileSync('runbook.schema.json', 'utf8'));
(0, vitest_1.describe)('Runbook manifest schema', () => {
    (0, vitest_1.it)('validates example runbook', () => {
        const rb = JSON.parse(node_fs_1.default.readFileSync('../examples/runbooks/backfill-entity-resolver.json', 'utf8'));
        const validate = ajv.compile(schema);
        (0, vitest_1.expect)(validate(rb)).toBe(true);
    });
});
