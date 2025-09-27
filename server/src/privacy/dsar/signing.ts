import * as crypto from 'crypto';
import type { ExportManifest, SignedExportPack } from './types';
import { hashDeterministic } from './proofs';

export class ExportPackSigner {
  constructor(private readonly privateKeyPem: string, private readonly publicKeyPem: string) {}

  sign(payload: string, manifest: ExportManifest): SignedExportPack {
    const digest = crypto.createHash('sha256').update(payload).digest('hex');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(payload);
    signer.end();
    const signature = signer.sign(this.privateKeyPem, 'base64');
    return {
      manifest,
      payload,
      signature,
      digest,
    };
  }

  verify(payload: string, signature: string): boolean {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(payload);
    verifier.end();
    return verifier.verify(this.publicKeyPem, signature, 'base64');
  }

  manifestDigest(manifest: ExportManifest): string {
    return hashDeterministic(manifest);
  }
}
