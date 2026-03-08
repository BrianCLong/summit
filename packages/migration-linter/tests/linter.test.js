"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const linter_js_1 = require("../src/linter.js");
const fixtures = (file) => node_path_1.default.join(__dirname, 'fixtures', file).replace(/\\/g, '/');
(0, vitest_1.describe)('migration linter', () => {
    (0, vitest_1.it)('allows additive nullable changes', async () => {
        const findings = await (0, linter_js_1.lintMigrations)({
            patterns: [fixtures('safe_add_nullable.sql')],
        });
        (0, vitest_1.expect)(findings).toHaveLength(0);
    });
    (0, vitest_1.it)('blocks destructive changes', async () => {
        const findings = await (0, linter_js_1.lintMigrations)({
            patterns: [fixtures('unsafe_drop_column.sql')],
        });
        (0, vitest_1.expect)(findings.some((f) => f.rule === 'drop-column')).toBe(true);
    });
    (0, vitest_1.it)('allows explicitly approved destructive changes', async () => {
        const findings = await (0, linter_js_1.lintMigrations)({
            patterns: [fixtures('unsafe_with_override.sql')],
        });
        (0, vitest_1.expect)(findings).toHaveLength(0);
    });
});
