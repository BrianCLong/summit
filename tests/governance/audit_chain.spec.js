"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const logger_js_1 = require("../../src/governance/audit/logger.js");
describe('Audit Chain', () => {
    const testFile = 'test_audit.json';
    afterEach(() => {
        if (fs_1.default.existsSync(testFile))
            fs_1.default.unlinkSync(testFile);
    });
    it('should maintain hash chain across multiple logs', () => {
        const logger = new logger_js_1.AuditLogger(testFile);
        const hash1 = logger.log({ id: 1, action: 'allow' });
        const hash2 = logger.log({ id: 2, action: 'deny' });
        const lines = fs_1.default.readFileSync(testFile, 'utf8').trim().split('\n');
        const log1 = JSON.parse(lines[0]);
        const log2 = JSON.parse(lines[1]);
        expect(log1.hash).toBe(hash1);
        expect(log2.previousHash).toBe(hash1);
        expect(log2.hash).toBe(hash2);
    });
});
