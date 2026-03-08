"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const phase1_1 = require("../src/security/phase1");
const policyDir = path_1.default.join(__dirname, '..', 'policy', 'phase1');
describe('Phase 1 gates', () => {
    it('validates exception metadata and expiry', () => {
        const policy = (0, phase1_1.loadExceptionPolicy)(path_1.default.join(policyDir, 'exception-allowlist.json'));
        expect(() => (0, phase1_1.assertExceptionsValid)(policy, new Date('2025-12-25T00:00:00Z'))).not.toThrow();
    });
    it('throws when exception expired', () => {
        const policy = (0, phase1_1.loadExceptionPolicy)(path_1.default.join(policyDir, 'exception-allowlist.json'));
        expect(() => (0, phase1_1.assertExceptionsValid)(policy, new Date('2027-01-01T00:00:00Z'))).toThrow(phase1_1.Phase1GateError);
    });
    it('blocks during freeze windows without break-glass', () => {
        const windows = (0, phase1_1.loadFreezeWindows)(path_1.default.join(policyDir, 'freeze-windows.json'));
        expect(() => (0, phase1_1.assertNotInFreeze)(windows, new Date('2025-12-24T12:00:00Z'))).toThrow(phase1_1.Phase1GateError);
    });
    it('allows during freeze when actor is approved and break-glass token present', () => {
        const windows = (0, phase1_1.loadFreezeWindows)(path_1.default.join(policyDir, 'freeze-windows.json'));
        expect(() => (0, phase1_1.assertNotInFreeze)(windows, new Date('2025-12-24T12:00:00Z'), 'sre@internal', 'token')).not.toThrow();
    });
    it('emits deterministic SBOM and provenance artifacts', () => {
        const distDir = path_1.default.join(__dirname, 'tmp-security');
        fs_1.default.rmSync(distDir, { recursive: true, force: true });
        const sbomPath = path_1.default.join(distDir, 'sbom.json');
        (0, phase1_1.generateSbom)(path_1.default.join(__dirname, '..', 'package.json'), sbomPath);
        expect(fs_1.default.existsSync(sbomPath)).toBe(true);
        const provenancePath = path_1.default.join(distDir, 'provenance.json');
        const provenance = (0, phase1_1.generateProvenance)({
            imageDigest: 'sha256:123',
            buildCommand: 'npm run build',
            repository: 'authz-gateway',
            commit: 'abc',
            ref: 'refs/heads/main',
            artifacts: [sbomPath],
        }, provenancePath, () => new Date('2025-12-24T00:00:00Z'));
        expect(provenance.metadata.startedOn).toBe('2025-12-24T00:00:00.000Z');
        expect(fs_1.default.existsSync(provenancePath)).toBe(true);
    });
    it('produces stable digest for directory contents', () => {
        const tmpDir = path_1.default.join(__dirname, 'digest-sandbox');
        fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        fs_1.default.mkdirSync(tmpDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(tmpDir, 'a.txt'), 'hello');
        fs_1.default.writeFileSync(path_1.default.join(tmpDir, 'b.txt'), 'world');
        const digestA = (0, phase1_1.digestForPath)(tmpDir);
        const digestB = (0, phase1_1.digestForPath)(tmpDir);
        expect(digestA).toEqual(digestB);
    });
    it('computes deterministic HMAC from provided secret', () => {
        expect((0, phase1_1.buildDeterministicHmac)('artifact', 'secret')).toEqual((0, phase1_1.buildDeterministicHmac)('artifact', 'secret'));
    });
    it('wraps cosign verify --use-signed-timestamps errors with actionable context', () => {
        expect(() => (0, phase1_1.cosignVerifyArtifact)('missing', 'sig')).toThrow(phase1_1.Phase1GateError);
    });
});
