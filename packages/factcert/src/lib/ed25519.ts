import { generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify, createPrivateKey, createPublicKey } from 'node:crypto';

export interface KeyPair {
  publicKey: string; // Hex (32 bytes -> 64 hex chars)
  privateKey: string; // Hex (d + x) (64 bytes -> 128 hex chars)
}

function base64UrlToHex(str: string): string {
  return Buffer.from(str, 'base64url').toString('hex');
}

function hexToBase64Url(str: string): string {
  return Buffer.from(str, 'hex').toString('base64url');
}

/**
 * Generate a new Ed25519 key pair.
 * @returns The key pair in hex format.
 */
export function generateEd25519KeyPair(): KeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');

  const privJwk = privateKey.export({ format: 'jwk' });
  const pubJwk = publicKey.export({ format: 'jwk' });

  if (!privJwk.d || !pubJwk.x) {
    throw new Error('Failed to export JWK keys');
  }

  const d = base64UrlToHex(privJwk.d);
  const x = base64UrlToHex(pubJwk.x);

  return {
    privateKey: d + x, // Concatenate d and x to form a self-contained private key string
    publicKey: x
  };
}

/**
 * Sign a message using an Ed25519 private key.
 * @param message The message to sign (string).
 * @param privateKeyHex The private key in hex format (must be 128 chars / 64 bytes: d + x).
 * @returns The signature in hex format.
 */
export function sign(message: string, privateKeyHex: string): string {
  // We expect privateKeyHex to contain both d and x (concatenated).
  // Length check: 128 hex chars.
  if (privateKeyHex.length !== 128) {
    throw new Error('Invalid private key length. Expected 128 hex characters (d + x).');
  }

  const dHex = privateKeyHex.slice(0, 64);
  const xHex = privateKeyHex.slice(64);

  const jwk = {
    kty: 'OKP',
    crv: 'Ed25519',
    d: hexToBase64Url(dHex),
    x: hexToBase64Url(xHex)
  };

  try {
    const privateKey = createPrivateKey({
      key: jwk,
      format: 'jwk'
    });
    const signature = cryptoSign(null, Buffer.from(message), privateKey);
    return signature.toString('hex');
  } catch (error) {
    throw new Error(`Signing failed: ${(error as Error).message}`);
  }
}

/**
 * Verify a signature using an Ed25519 public key.
 * @param message The message that was signed.
 * @param signatureHex The signature in hex format.
 * @param publicKeyHex The public key in hex format.
 * @returns True if valid, false otherwise.
 */
export function verify(message: string, signatureHex: string, publicKeyHex: string): boolean {
  const jwk = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: hexToBase64Url(publicKeyHex)
  };

  const publicKey = createPublicKey({
    key: jwk,
    format: 'jwk'
  });

  return cryptoVerify(null, Buffer.from(message), publicKey, Buffer.from(signatureHex, 'hex'));
}
