"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const secret_drift_js_1 = require("../secret-drift.js");
const path_1 = __importDefault(require("path"));
(0, globals_1.describe)('SecretDriftDetector', () => {
    const mockEnvPath = '/test/.env';
    let detector;
    const mockFs = {
        existsSync: globals_1.jest.fn(),
        readFileSync: globals_1.jest.fn(),
        readdirSync: globals_1.jest.fn(),
        statSync: globals_1.jest.fn(),
        writeFileSync: globals_1.jest.fn(),
    };
    const mockEnv = {};
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockEnv.SECRET_KEY = 'super_secret_value_123';
        detector = new secret_drift_js_1.SecretDriftDetector(mockEnvPath, {
            fs: mockFs,
            env: mockEnv
        });
        mockFs.existsSync.mockReturnValue(true);
    });
    (0, globals_1.describe)('detectUnusedSecrets', () => {
        (0, globals_1.it)('should detect keys in .env that are not in EnvSchema', () => {
            mockFs.readFileSync.mockReturnValue('NODE_ENV=test\nUNUSED_KEY=value\n# Comment\nSECRET_KEY=abc');
            const unused = detector.detectUnusedSecrets();
            // EnvSchema is still the real one, but we know it has NODE_ENV
            (0, globals_1.expect)(unused).toContain('UNUSED_KEY');
            (0, globals_1.expect)(unused).not.toContain('NODE_ENV');
        });
    });
    (0, globals_1.describe)('detectLeakedSecrets', () => {
        (0, globals_1.it)('should detect sensitive values in source files', () => {
            const leakedValue = 'super_secret_value_longer_than_8_chars';
            mockEnv.JWT_SECRET = leakedValue;
            // Mock readdirSync and statSync for traversal
            mockFs.readdirSync.mockImplementation((dir) => {
                if (dir === path_1.default.resolve(process.cwd(), 'src'))
                    return ['leaky.js'];
                return [];
            });
            mockFs.statSync.mockReturnValue({ isDirectory: () => false });
            mockFs.readFileSync.mockReturnValue(`const key = "${leakedValue}";`);
            const leaks = detector.detectLeakedSecrets();
            (0, globals_1.expect)(leaks).toHaveLength(1);
            (0, globals_1.expect)(leaks[0].secret).toBe('JWT_SECRET');
            (0, globals_1.expect)(leaks[0].file).toContain('leaky.js');
        });
    });
    (0, globals_1.describe)('detectExpiredSecrets', () => {
        (0, globals_1.it)('should detect insecure defaults', () => {
            mockEnv.JWT_SECRET = 'changeme_but_longer_to_pass_zod_if_needed';
            mockEnv.JWT_REFRESH_SECRET = 'changeme_but_longer_to_pass_zod_if_needed';
            const expired = detector.detectExpiredSecrets();
            (0, globals_1.expect)(expired.some(e => e.includes('insecure default detected'))).toBe(true);
        });
        (0, globals_1.it)('should detect expired secrets via _EXPIRY var', () => {
            mockEnv.JWT_SECRET = 'valid_secret_value_longer_than_32_chars';
            mockEnv.JWT_SECRET_EXPIRY = '2000-01-01T00:00:00Z'; // Past date
            const expired = detector.detectExpiredSecrets();
            (0, globals_1.expect)(expired.some(e => e.includes('expired on'))).toBe(true);
        });
    });
    (0, globals_1.describe)('enforceRemoval', () => {
        (0, globals_1.it)('should remove specified keys from .env file', () => {
            mockFs.readFileSync.mockReturnValue('KEEP=val\nREMOVE=val\n');
            detector.enforceRemoval(['REMOVE']);
            (0, globals_1.expect)(mockFs.writeFileSync).toHaveBeenCalledWith(mockEnvPath, 'KEEP=val\n');
        });
    });
});
