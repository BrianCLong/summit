"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
test_1.test.describe.configure({ mode: 'serial' });
test_1.test.describe('policy: redaction', () => {
    const artifactsDir = path_1.default.join(__dirname, '../../../artifacts/test-redaction');
    const scanScript = path_1.default.join(__dirname, '../../../scripts/ci/redaction_scan.sh');
    test_1.test.beforeAll(() => {
        if (!fs_1.default.existsSync(artifactsDir)) {
            fs_1.default.mkdirSync(artifactsDir, { recursive: true });
        }
    });
    test_1.test.beforeEach(() => {
        // Clean directory before each test
        if (fs_1.default.existsSync(artifactsDir)) {
            fs_1.default.rmSync(artifactsDir, { recursive: true, force: true });
            fs_1.default.mkdirSync(artifactsDir, { recursive: true });
        }
    });
    test_1.test.afterAll(() => {
        if (fs_1.default.existsSync(artifactsDir)) {
            fs_1.default.rmSync(artifactsDir, { recursive: true, force: true });
        }
    });
    (0, test_1.test)('scanner allows clean artifacts', () => {
        fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'clean.txt'), 'This is a clean file.');
        try {
            (0, child_process_1.execSync)(`${scanScript} ${artifactsDir}`, { stdio: 'pipe' });
        }
        catch (e) {
            throw new Error(`Scanner failed on clean artifact: ${e.stdout?.toString()}`);
        }
    });
    (0, test_1.test)('scanner detects secrets', () => {
        fs_1.default.writeFileSync(path_1.default.join(artifactsDir, 'dirty.txt'), 'Config: SECRET=super_sensitive_value');
        try {
            (0, child_process_1.execSync)(`${scanScript} ${artifactsDir}`, { stdio: 'pipe' });
            throw new Error('Scanner should have failed but passed.');
        }
        catch (e) {
            (0, test_1.expect)(e.status).toBe(1);
            const output = e.stdout?.toString() + e.stderr?.toString();
            (0, test_1.expect)(output).toContain('Forbidden pattern found');
        }
    });
});
