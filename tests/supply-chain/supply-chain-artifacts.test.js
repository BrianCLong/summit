"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supply_chain_artifacts_js_1 = require("../../scripts/supply-chain/supply-chain-artifacts.js");
describe('supply-chain artifacts', () => {
    const artifactsRoot = path_1.default.join(process.cwd(), 'artifacts');
    const cleanup = () => {
        if (fs_1.default.existsSync(artifactsRoot)) {
            fs_1.default.rmSync(artifactsRoot, { recursive: true, force: true });
        }
    };
    beforeEach(() => cleanup());
    afterEach(() => cleanup());
    it('builds deterministic SBOM document and provenance', () => {
        const commitSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
        const { sboms, provenance, auditSummary } = (0, supply_chain_artifacts_js_1.generateSupplyChainArtifacts)({
            commitSha,
            rootDir: process.cwd(),
            auditRunner: ({ outputPath }) => {
                const summary = {
                    critical: 0,
                    high: 1,
                    moderate: 2,
                    low: 0,
                    info: 0,
                    generatedAt: new Date().toISOString(),
                };
                fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
                fs_1.default.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
                return summary;
            },
        });
        expect(sboms).toHaveLength(3);
        expect(sboms.every((entry) => entry.path.includes(commitSha))).toBe(true);
        expect(provenance.path).toContain('provenance.json');
        expect(auditSummary.critical).toBe(0);
    });
    it('fails gate validation when artifacts are missing', () => {
        const commitSha = 'feedfacefeedfacefeedfacefeedfacefeedface';
        const result = (0, supply_chain_artifacts_js_1.validateSupplyChainArtifacts)({
            commitSha,
            rootDir: process.cwd(),
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.some((r) => r.toLowerCase().includes('missing'))).toBe(true);
    });
    it('includes components in sbom document', () => {
        const doc = (0, supply_chain_artifacts_js_1.buildSbomDocument)('server', 'abc123', '2023-01-01T00:00:00Z', [
            { type: 'library', name: 'dep', version: '1.0.0' },
        ]);
        expect(doc.bomFormat).toBe('CycloneDX');
        expect(doc.components?.[0]?.name).toBe('dep');
    });
});
