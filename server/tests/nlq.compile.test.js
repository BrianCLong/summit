"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../../packages/sdk/nlq-js/src/index.js");
const globals_1 = require("@jest/globals");
// Use process.cwd() since tests run from server directory
(0, globals_1.describe)('nlq compile', () => {
    const fixturePath = path_1.default.join(process.cwd(), '../tests/fixtures/nlq/golden.json');
    const fixtures = JSON.parse(fs_1.default.readFileSync(fixturePath, 'utf8'));
    (0, globals_1.it)('matches golden fixtures', () => {
        for (const { nl, cypher, params } of fixtures) {
            const result = (0, index_js_1.compile)(nl);
            (0, globals_1.expect)(result.cypher).toBe(cypher);
            (0, globals_1.expect)(result.params).toEqual(params);
        }
    });
    (0, globals_1.it)('rejects write operations', () => {
        (0, globals_1.expect)(() => (0, index_js_1.compile)('delete all nodes')).toThrow('write operations are not allowed');
    });
});
