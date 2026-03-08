"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
describe('provenance helpers', () => {
    it('hashJson matches hashContent of stringified data', () => {
        const obj = { a: 1 };
        expect((0, index_1.hashJson)(obj)).toBe((0, index_1.hashContent)(JSON.stringify(obj)));
    });
    it('recordStep appends hashed step', () => {
        const manifest = { artifactId: 'a1', steps: [] };
        const step = (0, index_1.recordStep)(manifest, {
            id: 's1',
            tool: 'test',
            params: {},
            input: 'in',
            output: 'out',
        });
        expect(manifest.steps).toHaveLength(1);
        expect(step.outputHash).toBe((0, index_1.hashContent)('out'));
    });
    it('verifyManifest returns true for matching hashes', () => {
        const manifest = { artifactId: 'a1', steps: [] };
        (0, index_1.recordStep)(manifest, {
            id: 'step1',
            tool: 'test',
            params: {},
            input: 'in',
            output: 'result',
            timestamp: '2024-01-01T00:00:00Z',
        });
        const ok = (0, index_1.verifyManifest)(manifest, { step1: 'result' });
        expect(ok).toBe(true);
    });
    it('verifyManifest returns false for missing artifacts', () => {
        const manifest = { artifactId: 'a1', steps: [] };
        (0, index_1.recordStep)(manifest, {
            id: 'step1',
            tool: 'test',
            params: {},
            input: 'in',
            output: 'result',
        });
        const ok = (0, index_1.verifyManifest)(manifest, {});
        expect(ok).toBe(false);
    });
});
