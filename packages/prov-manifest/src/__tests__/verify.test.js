"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const generate_js_1 = require("../generate.js");
const verify_js_1 = require("../verify.js");
describe('verifyManifest', () => {
    const fixturesDir = path_1.default.resolve(__dirname, 'fixtures');
    const manifestPath = path_1.default.join(fixturesDir, 'manifest.json');
    beforeEach(async () => {
        await (0, generate_js_1.generateManifest)(fixturesDir, { test: 'data' });
    });
    afterEach(async () => {
        try {
            await fs_1.promises.unlink(manifestPath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    });
    it('should successfully verify a valid manifest', async () => {
        const result = await (0, verify_js_1.verifyManifest)(manifestPath, fixturesDir);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it('should fail if the manifest file is not found', async () => {
        const result = await (0, verify_js_1.verifyManifest)('nonexistent-manifest.json', fixturesDir);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Manifest file not found at nonexistent-manifest.json');
    });
    it('should fail if a file is missing', async () => {
        const manifestContent = await fs_1.promises.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        manifest.files['nonexistent-file.txt'] = { hash: '123', size: 123 };
        await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest));
        const result = await (0, verify_js_1.verifyManifest)(manifestPath, fixturesDir);
        expect(result.success).toBe(false);
        expect(result.errors).toContain('File not found: nonexistent-file.txt');
    });
    it('should fail if a file hash is incorrect', async () => {
        const manifestContent = await fs_1.promises.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        if (manifest.files['file1.txt']) {
            manifest.files['file1.txt'].hash = 'incorrect-hash';
        }
        await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest));
        const result = await (0, verify_js_1.verifyManifest)(manifestPath, fixturesDir);
        expect(result.success).toBe(false);
        expect(result.errors[0]).toMatch(/Hash mismatch for file: file1.txt/);
    });
});
