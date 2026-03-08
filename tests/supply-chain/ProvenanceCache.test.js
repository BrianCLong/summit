"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ProvenanceCache_1 = require("../../src/supply-chain/ProvenanceCache");
describe('ProvenanceCache', () => {
    const setupWorkspace = async () => {
        const workspace = await fs_1.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'prov-cache-'));
        const artifactPath = path_1.default.join(workspace, 'artifact.bin');
        const attestationPath = `${artifactPath}.attestation.json`;
        const inputPath = path_1.default.join(workspace, 'input.txt');
        await fs_1.promises.writeFile(artifactPath, 'artifact-contents');
        await fs_1.promises.writeFile(attestationPath, 'attestation-contents');
        await fs_1.promises.writeFile(inputPath, 'input-v1');
        return { workspace, artifactPath, attestationPath, inputPath };
    };
    it('returns cache hit when inputs and artifacts are unchanged', async () => {
        const { workspace, artifactPath, attestationPath, inputPath } = await setupWorkspace();
        const cache = new ProvenanceCache_1.ProvenanceCache({
            cacheFile: path_1.default.join(workspace, '.provenance-cache.json'),
            artifactPath,
            attestationPath,
            inputs: [inputPath],
        });
        const firstPass = await cache.validate();
        expect(firstPass.cacheHit).toBe(false);
        const record = await cache.snapshot({ rekorEntryUUID: 'uuid-1' });
        await cache.persist(record);
        const secondPass = await cache.validate();
        expect(secondPass.cacheHit).toBe(true);
        expect(secondPass.previous?.rekorEntryUUID).toBe('uuid-1');
    });
    it('detects cache misses when inputs change', async () => {
        const { workspace, artifactPath, attestationPath, inputPath } = await setupWorkspace();
        const cache = new ProvenanceCache_1.ProvenanceCache({
            cacheFile: path_1.default.join(workspace, '.provenance-cache.json'),
            artifactPath,
            attestationPath,
            inputs: [inputPath],
        });
        const baseline = await cache.snapshot();
        await cache.persist(baseline);
        await fs_1.promises.writeFile(inputPath, 'input-v2');
        const secondPass = await cache.validate();
        expect(secondPass.cacheHit).toBe(false);
        expect(secondPass.reason).toBe('inputs fingerprint changed');
    });
});
