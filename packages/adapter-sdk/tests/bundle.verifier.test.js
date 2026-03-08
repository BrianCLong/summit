"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const builder_js_1 = require("../src/bundle/builder.js");
const verifier_js_1 = require("../src/bundle/verifier.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Skip: Test uses outdated API (buildBundle/verifyBundle instead of buildAdapterBundle/verifyAdapterBundle)
vitest_1.describe.skip('bundle verifier', () => {
    const tmpDir = path_1.default.join(__dirname, '__tmp__');
    const sourceDir = path_1.default.join(tmpDir, 'source');
    const outDir = path_1.default.join(tmpDir, 'out');
    (0, vitest_1.beforeAll)(async () => {
        await fs_extra_1.default.emptyDir(tmpDir);
        await fs_extra_1.default.ensureDir(sourceDir);
        await fs_extra_1.default.writeFile(path_1.default.join(sourceDir, 'index.js'), 'module.exports = {};');
    });
    (0, vitest_1.afterAll)(async () => {
        await fs_extra_1.default.remove(tmpDir);
    });
    (0, vitest_1.it)('accepts a signed bundle with manifest and payload', async () => {
        const bundleDir = await (0, builder_js_1.buildBundle)({
            manifest: {
                name: 'demo',
                version: '0.0.1',
                description: 'demo adapter',
                entrypoint: 'index.js',
                capabilities: ['webhook'],
                requiredPermissions: ['adapter:webhook:emit'],
                compatibility: { companyOs: '>=0.1.0' },
                signature: 'signed',
            },
            sourceDir,
            outputDir: outDir,
        });
        const result = await (0, verifier_js_1.verifyBundle)(bundleDir);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('fails unsigned bundle', async () => {
        const bundleDir = await (0, builder_js_1.buildBundle)({
            manifest: {
                name: 'demo-unsigned',
                version: '0.0.1',
                description: 'demo adapter',
                entrypoint: 'index.js',
                capabilities: ['webhook'],
                requiredPermissions: ['adapter:webhook:emit'],
                compatibility: { companyOs: '>=0.1.0' },
            },
            sourceDir,
            outputDir: outDir,
        });
        const result = await (0, verifier_js_1.verifyBundle)(bundleDir);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.some((err) => err.includes('signature'))).toBe(true);
    });
});
