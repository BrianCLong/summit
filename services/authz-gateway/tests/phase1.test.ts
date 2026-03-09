import fs from 'fs';
import path from 'path';
import {
  assertExceptionsValid,
  assertNotInFreeze,
  buildDeterministicHmac,
  cosignVerifyArtifact,
  digestForPath,
  generateProvenance,
  generateSbom,
  loadExceptionPolicy,
  loadFreezeWindows,
  Phase1GateError,
} from '../src/security/phase1';

const policyDir = path.join(__dirname, '..', 'policy', 'phase1');

describe('Phase 1 gates', () => {
  it('validates exception metadata and expiry', () => {
    const policy = loadExceptionPolicy(path.join(policyDir, 'exception-allowlist.json'));
    expect(() => assertExceptionsValid(policy, new Date('2025-12-25T00:00:00Z'))).not.toThrow();
  });

  it('throws when exception expired', () => {
    const policy = loadExceptionPolicy(path.join(policyDir, 'exception-allowlist.json'));
    expect(() => assertExceptionsValid(policy, new Date('2027-01-01T00:00:00Z'))).toThrow(Phase1GateError);
  });

  it('blocks during freeze windows without break-glass', () => {
    const windows = loadFreezeWindows(path.join(policyDir, 'freeze-windows.json'));
    expect(() => assertNotInFreeze(windows, new Date('2025-12-24T12:00:00Z'))).toThrow(Phase1GateError);
  });

  it('allows during freeze when actor is approved and break-glass token present', () => {
    const windows = loadFreezeWindows(path.join(policyDir, 'freeze-windows.json'));
    expect(() =>
      assertNotInFreeze(windows, new Date('2025-12-24T12:00:00Z'), 'sre@internal', 'token'),
    ).not.toThrow();
  });

  it('emits deterministic SBOM and provenance artifacts', () => {
    const distDir = path.join(__dirname, 'tmp-security');
    fs.rmSync(distDir, { recursive: true, force: true });
    const sbomPath = path.join(distDir, 'sbom.json');
    generateSbom(path.join(__dirname, '..', 'package.json'), sbomPath);
    expect(fs.existsSync(sbomPath)).toBe(true);

    const provenancePath = path.join(distDir, 'provenance.json');
    const provenance = generateProvenance(
      {
        imageDigest: 'sha256:123',
        buildCommand: 'npm run build',
        repository: 'authz-gateway',
        commit: 'abc',
        ref: 'refs/heads/main',
        artifacts: [sbomPath],
      },
      provenancePath,
      () => new Date('2025-12-24T00:00:00Z'),
    );
    expect(provenance.metadata.startedOn).toBe('2025-12-24T00:00:00.000Z');
    expect(fs.existsSync(provenancePath)).toBe(true);
  });

  it('produces stable digest for directory contents', () => {
    const tmpDir = path.join(__dirname, 'digest-sandbox');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'world');

    const digestA = digestForPath(tmpDir);
    const digestB = digestForPath(tmpDir);
    expect(digestA).toEqual(digestB);
  });

  it('computes deterministic HMAC from provided secret', () => {
    expect(buildDeterministicHmac('artifact', 'secret')).toEqual(buildDeterministicHmac('artifact', 'secret'));
  });

  it('wraps cosign verify errors with actionable context', () => {
    expect(() => cosignVerifyArtifact('missing', 'sig')).toThrow(Phase1GateError);
  });
});
