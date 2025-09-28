import { createHash, createHmac } from 'node:crypto';
import { verifyAttestationQuote } from '../src/efs/index.js';

describe('verifyAttestationQuote', () => {
  it('validates measurement and signature', () => {
    const tenantId = 'tenant-1';
    const featureKey = 'feature-a';
    const sealedNonce = Buffer.from([1, 2, 3, 4]);
    const sealedCipher = Buffer.from([5, 6, 7, 8]);
    const policyHash = Buffer.alloc(32, 7);
    const requestNonce = Buffer.from([9, 9, 9, 1]);
    const timestamp = new Date().toISOString();

    const measurement = createHash('sha256')
      .update(Buffer.from(tenantId, 'utf8'))
      .update(Buffer.from(featureKey, 'utf8'))
      .update(sealedNonce)
      .update(sealedCipher)
      .digest();

    const attestationKey = Buffer.alloc(32, 11);
    const signatureMessage = Buffer.concat([
      Buffer.from(tenantId, 'utf8'),
      Buffer.from(featureKey, 'utf8'),
      requestNonce,
      policyHash,
      measurement,
      Buffer.from(timestamp, 'utf8'),
    ]);
    const signature = createHmac('sha256', attestationKey).update(signatureMessage).digest();

    const bundle = {
      sealedBlob: {
        nonce: sealedNonce.toString('base64'),
        ciphertext: sealedCipher.toString('base64'),
      },
      report: {
        policyHash: policyHash.toString('base64'),
        quote: {
          tenantId,
          featureKey,
          nonce: requestNonce.toString('base64'),
          measurement: measurement.toString('base64'),
          policyHash: policyHash.toString('base64'),
          timestamp,
          signature: signature.toString('base64'),
        },
      },
    };

    expect(verifyAttestationQuote(bundle, attestationKey)).toBe(true);

    const tampered = {
      ...bundle,
      report: {
        ...bundle.report,
        quote: {
          ...bundle.report.quote,
          measurement: Buffer.alloc(measurement.length, 0xaa).toString('base64'),
        },
      },
    };

    expect(verifyAttestationQuote(tampered, attestationKey)).toBe(false);
  });
});
