"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const provenance_js_1 = require("../provenance.js");
const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PxX1VQAAAABJRU5ErkJggg==';
function writeFixture(filename) {
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'summit-media-'));
    const filePath = node_path_1.default.join(dir, filename);
    node_fs_1.default.writeFileSync(filePath, Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
    return filePath;
}
function hashBuffer(buffer) {
    return node_crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
(0, vitest_1.describe)('media provenance evidence', () => {
    (0, vitest_1.it)('extracts deterministic metadata from a fixture', async () => {
        const fixturePath = writeFixture('fixture.png');
        const inputPath = node_path_1.default.relative(process.cwd(), fixturePath);
        const evidence = await (0, provenance_js_1.buildMediaEvidence)({
            inputPath,
            resolvedPath: fixturePath,
            toolName: 'summit',
            toolVersion: 'test',
        });
        (0, vitest_1.expect)(evidence.report.media.mime).toBe('image/png');
        (0, vitest_1.expect)(evidence.report.media.container).toBe('png');
        (0, vitest_1.expect)(evidence.report.media.codec).toBe('png');
        (0, vitest_1.expect)(evidence.report).not.toHaveProperty('generatedAt');
        (0, vitest_1.expect)(evidence.metrics).not.toHaveProperty('generatedAt');
    });
    (0, vitest_1.it)('matches the golden report output for a fixture', async () => {
        const fixturePath = writeFixture('golden.png');
        const buffer = node_fs_1.default.readFileSync(fixturePath);
        const expectedHash = hashBuffer(buffer);
        const inputPath = node_path_1.default.relative(process.cwd(), fixturePath);
        const evidence = await (0, provenance_js_1.buildMediaEvidence)({
            inputPath,
            resolvedPath: fixturePath,
            toolName: 'summit',
            toolVersion: 'test',
        });
        (0, vitest_1.expect)(evidence.report).toMatchObject({
            schemaVersion: '1.0.0',
            input: {
                path: inputPath,
                filename: 'golden.png',
            },
            media: {
                sha256: expectedHash,
                mime: 'image/png',
                extension: '.png',
                container: 'png',
                codec: 'png',
            },
            provenance: {
                c2pa: {
                    present: false,
                    status: 'absent',
                },
            },
        });
        (0, vitest_1.expect)(evidence.metrics).toEqual({
            schemaVersion: '1.0.0',
            counts: {
                files: 1,
                c2paPresent: 0,
                c2paUnverified: 0,
            },
        });
    });
});
