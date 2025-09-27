import { promises as fs } from 'fs';
import crypto from 'crypto';

export async function signManifest(manifestPath: string, privateKeyPath: string): Promise<string> {
  const [manifest, privateKey] = await Promise.all([
    fs.readFile(manifestPath),
    fs.readFile(privateKeyPath, 'utf8')
  ]);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(manifest);
  signer.end();

  const signature = signer.sign(privateKey);
  return signature.toString('base64');
}

export async function verifySignature(
  manifestPath: string,
  signature: string,
  publicKeyPath: string
): Promise<boolean> {
  const [manifest, publicKey] = await Promise.all([
    fs.readFile(manifestPath),
    fs.readFile(publicKeyPath, 'utf8')
  ]);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(manifest);
  verifier.end();

  return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}
