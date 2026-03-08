"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schema_1 = require("./schema");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
(0, vitest_1.describe)('PR-Chain Schema Validation', () => {
    (0, vitest_1.it)('should validate initial fixtures against the schema', () => {
        const fixturesPath = path_1.default.join(__dirname, '../fixtures/pr_chains.jsonl');
        const content = fs_1.default.readFileSync(fixturesPath, 'utf8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
            const data = JSON.parse(line);
            const result = schema_1.PRChainSchema.safeParse(data);
            if (!result.success) {
                console.error('Validation failed for:', data.id);
                console.error(result.error.format());
            }
            (0, vitest_1.expect)(result.success).toBe(true);
        }
    });
    (0, vitest_1.it)('should fail on invalid data', () => {
        const invalidData = {
            id: 'invalid-001',
            goal: 'Missing steps',
            // steps: [], // Required
            verdict: 'invalid-verdict'
        };
        const result = schema_1.PRChainSchema.safeParse(invalidData);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
