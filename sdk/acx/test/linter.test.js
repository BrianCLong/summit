"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const validators_js_1 = require("../src/validators.js");
const dark_patterns_json_1 = __importDefault(require("../src/dark-patterns.json"));
const require = (0, node_module_1.createRequire)(import.meta.url);
const pack = require('../templates/policyPack.json');
describe('DarkPatternLinter', () => {
    it('produces no findings for the curated pack', () => {
        const linter = new validators_js_1.DarkPatternLinter(dark_patterns_json_1.default);
        expect(linter.lintPack(pack)).toEqual([]);
    });
    it('flags disallowed language', () => {
        const linter = new validators_js_1.DarkPatternLinter(dark_patterns_json_1.default);
        const mutated = {
            ...pack,
            locales: {
                ...pack.locales,
                'en-US': {
                    ...pack.locales['en-US'],
                    summary: 'You must accept to continue'
                }
            }
        };
        const findings = linter.lintPack(mutated);
        expect(findings.length).toBeGreaterThan(0);
        expect(findings[0].locale).toBe('en-US');
    });
});
