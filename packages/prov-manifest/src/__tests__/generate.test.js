"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const generate_js_1 = require("../generate.js");
describe('generateManifest', () => {
    const fixturesDir = path_1.default.resolve(__dirname, 'fixtures');
    const manifestPath = path_1.default.join(fixturesDir, 'manifest.json');
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
    it('should generate a manifest for a given directory', async () => {
        const metadata = { test: 'data' };
        const manifest = await (0, generate_js_1.generateManifest)(fixturesDir, metadata);
        expect(manifest.version).toBe('1.0.0');
        expect(manifest.metadata).toEqual(metadata);
        expect(Object.keys(manifest.files)).toHaveLength(2);
        expect(manifest.files['file1.txt']).toBeDefined();
        expect(manifest.files['file2.txt']).toBeDefined();
        const manifestContent = await fs_1.promises.readFile(manifestPath, 'utf-8');
        const manifestJson = JSON.parse(manifestContent);
        expect(manifestJson).toEqual(manifest);
    });
});
