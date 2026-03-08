"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const exporter_1 = require("../src/exporter");
const jszip_1 = __importDefault(require("jszip"));
const crypto_1 = require("crypto");
const sample = {
    entities: [{ id: '1', name: 'Alice', secret: 's1' }],
    edges: [{ source: '1', target: '2', weight: 5, secret: 'e1' }],
    redactRules: [{ field: 'secret', action: 'drop' }],
    format: ['json', 'csv', 'pdf'],
};
describe('exporter', () => {
    it('creates manifest with correct hashes', async () => {
        const zipBuf = await (0, exporter_1.createExport)(sample);
        const zip = await jszip_1.default.loadAsync(zipBuf);
        const manifestStr = await zip.file('manifest.json').async('string');
        const manifest = JSON.parse(manifestStr);
        for (const file of manifest.files) {
            const content = await zip.file(file.path).async('nodebuffer');
            const hash = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
            expect(hash).toBe(file.sha256);
        }
        const entitiesJson = await zip.file('data/entities.json').async('string');
        expect(entitiesJson).toBe('[{"id":"1","name":"Alice"}]');
    });
    it('produces identical zip for same input', async () => {
        const z1 = await (0, exporter_1.createExport)(sample);
        const z2 = await (0, exporter_1.createExport)(sample);
        const h1 = (0, crypto_1.createHash)('sha256').update(z1).digest('hex');
        const h2 = (0, crypto_1.createHash)('sha256').update(z2).digest('hex');
        expect(h1).toBe(h2);
    });
});
