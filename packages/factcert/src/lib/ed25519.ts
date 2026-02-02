import { generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';

export type KeyPair = { publicKey: string; secretKey: string };

/**
 * Generate a new Ed25519 key pair.
 * Returns keys in PEM format for compatibility with node:crypto.
 */
export function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey: publicKey as string, secretKey: privateKey as string };
}

/**
 * Sign a message using Ed25519.
 */
export function signDetached(message: Uint8Array, secretKey: string | Uint8Array): Uint8Array {
  // node:crypto automatically handles Ed25519 detached signatures when algorithm is null/undefined
  // provided the key is an Ed25519 key.
  const keyInput = secretKey instanceof Uint8Array ? Buffer.from(secretKey) : secretKey;
  const key = createPrivateKey(keyInput);
  const signature = sign(null, message, key);
  return new Uint8Array(signature);
}

/**
 * Verify an Ed25519 signature.
 */
export function verifyDetached(sig: Uint8Array, message: Uint8Array, publicKey: string | Uint8Array): boolean {
  try {
    const keyInput = publicKey instanceof Uint8Array ? Buffer.from(publicKey) : publicKey;
    const key = createPublicKey(keyInput);
    return verify(null, message, key, sig);
  } catch (e) {
    return false;
  }
}
