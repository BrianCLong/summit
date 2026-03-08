"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ledger_1 = require("../src/ledger");
const cli_1 = require("../src/cli");
const fs_1 = __importDefault(require("fs"));
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const path_1 = __importDefault(require("path"));
describe('prov-ledger', () => {
    test('manifest verification', async () => {
        const ev = (0, ledger_1.registerEvidence)({
            contentHash: 'abcd',
            licenseId: 'L1',
            source: 'src',
            transforms: [],
        });
        const cl = (0, ledger_1.createClaim)({
            evidenceIds: [ev.id],
            text: 'test claim',
            confidence: 0.9,
            links: [],
        });
        const manifest = (0, ledger_1.buildManifest)([cl.id]);
        expect((0, ledger_1.verifyClaim)(manifest.claims[0])).toBe(true);
        expect(manifest.merkleRoot).toBe((0, ledger_1.merkleRoot)([cl.hash]));
    });
    test('cli verifies generated bundle', async () => {
        const ev = (0, ledger_1.registerEvidence)({
            contentHash: 'efgh',
            licenseId: 'MIT',
            source: 'src',
            transforms: [],
        });
        const cl = (0, ledger_1.createClaim)({
            evidenceIds: [ev.id],
            text: 'another claim',
            confidence: 0.8,
            links: [],
        });
        const manifest = (0, ledger_1.buildManifest)([cl.id]);
        const pack = tar_stream_1.default.pack();
        pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest));
        pack.finalize();
        const bundlePath = path_1.default.join(__dirname, 'bundle.tgz');
        await new Promise((resolve) => {
            const write = fs_1.default.createWriteStream(bundlePath);
            pack.pipe((0, zlib_1.createGzip)()).pipe(write);
            write.on('finish', () => resolve());
        });
        await expect((0, cli_1.verifyBundle)(bundlePath)).resolves.toBe(true);
        fs_1.default.unlinkSync(bundlePath);
    });
    test('incompatible license blocks export', () => {
        const ev = (0, ledger_1.registerEvidence)({
            contentHash: 'ijkl',
            licenseId: 'GPL-3.0',
            source: 'src',
            transforms: [],
        });
        const cl = (0, ledger_1.createClaim)({
            evidenceIds: [ev.id],
            text: 'restricted claim',
            confidence: 0.7,
            links: [],
        });
        const manifest = (0, ledger_1.buildManifest)([cl.id]);
        const check = (0, ledger_1.checkLicenses)(manifest.licenses);
        expect(check.valid).toBe(false);
        expect(check.appealCode).toBe('LIC001');
    });
});
