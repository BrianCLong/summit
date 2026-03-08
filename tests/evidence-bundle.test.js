"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const generate_evidence_bundle_1 = require("../scripts/ops/generate-evidence-bundle");
const FIXED_TIMESTAMP = '2024-12-31T23:59:59Z';
const FIXED_COMMIT = '0123456789abcdef0123456789abcdef01234567';
const makeFile = async (root, relativePath, contents) => {
    const fullPath = path_1.default.join(root, relativePath);
    await (0, promises_1.writeFile)(fullPath, contents);
    return fullPath;
};
describe('generateEvidenceBundle', () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await (0, promises_1.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'evidence-bundle-'));
    });
    afterEach(async () => {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    });
    it('creates a complete bundle with deterministic structure and manifest hashes', async () => {
        const controlMappingPath = await makeFile(tempDir, 'control-mapping.md', '# Controls');
        const sloConfigPath = await makeFile(tempDir, 'slo.yaml', 'service: api');
        const sloSnapshotPath = await makeFile(tempDir, 'slo-snapshot.json', JSON.stringify({ status: 'ok' }));
        const llmPolicyPath = await makeFile(tempDir, 'llm-policy.yaml', 'providers: []');
        const multiTenantPath = await makeFile(tempDir, 'multi-tenant.json', JSON.stringify({ isolation: 'strict' }));
        const sbomPath = await makeFile(tempDir, 'sbom.json', JSON.stringify({ components: [] }));
        const provenancePath = await makeFile(tempDir, 'prov.json', JSON.stringify({ provenance: true }));
        const packageJsonPath = await makeFile(tempDir, 'package.json', JSON.stringify({ name: 'fixture', version: '0.0.1', dependencies: { alpha: '1.0.0' } }));
        const { bundlePath, manifest } = await (0, generate_evidence_bundle_1.generateEvidenceBundle)({
            outputRoot: path_1.default.join(tempDir, 'out'),
            timestamp: FIXED_TIMESTAMP,
            commitSha: FIXED_COMMIT,
            branch: 'main',
            controlMappingPath,
            sloConfigPath,
            sloSnapshotPath,
            llmPolicyPath,
            multiTenantSummaryPath: multiTenantPath,
            sbomPaths: [sbomPath],
            packageJsonPath,
            provenancePath,
            gaGateNotes: 'test-run',
        });
        const manifestOnDisk = JSON.parse(await (0, promises_1.readFile)(path_1.default.join(bundlePath, 'manifest.json'), 'utf-8'));
        expect(manifestOnDisk.files.map((f) => f.path)).toEqual(manifest.files.map(file => file.path));
        const manifestHash = (0, crypto_1.createHash)('sha256')
            .update(await (0, promises_1.readFile)(path_1.default.join(bundlePath, 'manifest.json')))
            .digest('hex');
        const manifestShaFile = (await (0, promises_1.readFile)(path_1.default.join(bundlePath, 'manifest.sha256'), 'utf-8')).trim();
        expect(manifestShaFile).toBe(`${manifestHash}  manifest.json`);
        const requiredPaths = [
            'ga-gate-report.json',
            'ci/metadata.json',
            'provenance.json',
            'slo/config.yaml',
            'slo/snapshot.json',
            'llm/policy.yaml',
            'controls/multi-tenant-summary.json',
            'controls/control-mapping.md',
            'sboms/sbom.json',
        ];
        requiredPaths.forEach(expected => expect(manifest.files.find(file => file.path === expected)).toBeDefined());
        expect(manifest.bundle.name).toContain('evidence-');
        expect(manifest.bundle.commit).toBe(FIXED_COMMIT);
    });
    it('fails fast when required inputs are missing', async () => {
        await expect((0, generate_evidence_bundle_1.generateEvidenceBundle)({
            outputRoot: path_1.default.join(tempDir, 'out'),
            timestamp: FIXED_TIMESTAMP,
            commitSha: FIXED_COMMIT,
            branch: 'main',
            controlMappingPath: path_1.default.join(tempDir, 'missing.md'),
        })).rejects.toThrow(/missing/i);
    });
});
