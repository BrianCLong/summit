import { createSign, createVerify } from 'node:crypto';
import { ConsentArtifact, ConsentRecord } from './types.js';

export class ConsentArtifactSigner {
  constructor(private readonly privateKeyPem: string, private readonly algorithm: string = 'RSA-SHA256') {}

  public sign(record: ConsentRecord): ConsentArtifact {
    const signer = createSign('RSA-SHA256');
    const payload = JSON.stringify(record);
    signer.update(payload);
    signer.end();
    const signature = signer.sign(this.privateKeyPem, 'base64');
    return {
      algorithm: this.algorithm,
      signature,
      payload: record
    };
  }

  public static verify(artifact: ConsentArtifact, publicKeyPem: string): boolean {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(JSON.stringify(artifact.payload));
    verifier.end();
    return verifier.verify(publicKeyPem, artifact.signature, 'base64');
  }
}
