import { CasePackSigner } from '../../src/modules/casepack/casepack.signer';
import { CasePackManifest } from '../../src/modules/casepack/casepack.types';
import * as crypto from 'crypto';

describe('CasePackSigner', () => {
  let signer: CasePackSigner;
  let manifest: CasePackManifest;

  beforeEach(() => {
    signer = new CasePackSigner();
    manifest = {
      pack_id: 'test-pack',
      case_id: 'test-case',
      tenant_id: 'test-tenant',
      revision: 1,
      created_at: new Date().toISOString(),
      scope: { selectors: [] },
      inventory: { objects: [], attachments: [] },
      budgets: { total_bytes: 1000, max_objects: 10 },
      actuals: { total_bytes: 0, object_counts: {} },
      provenance: { git_sha: 'test-sha', build_id: 'test-build' },
      signature: {
        algorithm: 'SHA256withRSA',
        key_id: 'test-key',
        canonicalization: 'JCS',
      },
    };
  });

  it('should create a deterministic hash of the manifest', () => {
    const hash1 = signer.createManifestHash(manifest);
    const hash2 = signer.createManifestHash(manifest);
    expect(hash1).toEqual(hash2);
  });

  it('should exclude created_at from the hash', () => {
    const hash1 = signer.createManifestHash(manifest);
    manifest.created_at = new Date().toISOString();
    const hash2 = signer.createManifestHash(manifest);
    expect(hash1).toEqual(hash2);
  });

  it('should sign and verify data', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const data = 'test data';
    const signature = signer.sign(data, privateKey.export({ type: 'pkcs1', format: 'pem' }).toString());

    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();

    expect(verify.verify(publicKey.export({ type: 'spki', format: 'pem' }), signature, 'hex')).toBe(true);
  });
});
