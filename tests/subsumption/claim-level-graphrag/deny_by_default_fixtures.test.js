"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Claim-Level GraphRAG Deny-by-Default Fixtures', () => {
    const rootDir = process.cwd();
    const fixturesDir = path_1.default.join(rootDir, 'subsumption', 'claim-level-graphrag', 'deny-fixtures');
    test('unsupported_claim.json should exist and have unsupported status', () => {
        const filePath = path_1.default.join(fixturesDir, 'unsupported_claim.json');
        expect(fs_1.default.existsSync(filePath)).toBe(true);
        const content = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        expect(content.expected_support).toBe('unsupported');
    });
    test('contradiction_claim.json should exist and have contradicted status', () => {
        const filePath = path_1.default.join(fixturesDir, 'contradiction_claim.json');
        expect(fs_1.default.existsSync(filePath)).toBe(true);
        const content = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        expect(content.expected_support).toBe('contradicted');
    });
    test('prompt_injection_evidence.json should exist and be flagged as injection', () => {
        const filePath = path_1.default.join(fixturesDir, 'prompt_injection_evidence.json');
        expect(fs_1.default.existsSync(filePath)).toBe(true);
        const content = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        expect(content.is_injection).toBe(true);
        expect(content.expected_support).not.toBe('supported');
    });
});
