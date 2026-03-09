import { generateKeyPair, createSign, createVerify, KeyObject } from 'node:crypto';

export class SigningService {
  async sign(payload: Buffer, privateKeyPem: string): Promise<string> {
    const sign = createSign('RSA-SHA256');
    sign.update(payload);
    return sign.sign(privateKeyPem, 'base64');
  }

  verify(payload: Buffer, signature: string, publicKeyPem: string): boolean {
    const verify = createVerify('RSA-SHA256');
    verify.update(payload);
    return verify.verify(publicKeyPem, signature, 'base64');
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    return new Promise((resolve, reject) => {
      generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      }, (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({
          publicKey: publicKey.toString(),
          privateKey: privateKey.toString()
        });
      });
    });
  }
}
