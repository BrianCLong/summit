import { generateKeyPairSync, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';

// Utilities for Hex <-> Base64URL
const hexToBuf = (hex: string) => Buffer.from(hex, 'hex');
const bufToHex = (buf: Buffer) => buf.toString('hex');
const bufToBase64Url = (buf: Buffer) => buf.toString('base64url');
const base64UrlToBuf = (str: string) => Buffer.from(str, 'base64url');

export interface Keypair {
  publicKeyHex: string;
  privateKeyHex: string;
}

export function generateKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const pubJwk = publicKey.export({ format: 'jwk' });
  const privJwk = privateKey.export({ format: 'jwk' });

  // Ed25519 JWK uses 'x' for public key and 'd' for private key
  const publicKeyHex = bufToHex(base64UrlToBuf(pubJwk.x!));
  const privateKeyHex = bufToHex(base64UrlToBuf(privJwk.d!));

  return { publicKeyHex, privateKeyHex };
}

export function sign(message: string, keys: Keypair): string {
  const privateKey = createPrivateKey({
    key: {
      kty: 'OKP',
      crv: 'Ed25519',
      d: bufToBase64Url(hexToBuf(keys.privateKeyHex)),
      x: bufToBase64Url(hexToBuf(keys.publicKeyHex))
    },
    format: 'jwk'
  });

  const signature = cryptoSign(null, Buffer.from(message, 'utf8'), privateKey);
  return signature.toString('hex');
}

export function verify(message: string, signatureHex: string, publicKeyHex: string): boolean {
  try {
    const publicKey = createPublicKey({
      key: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: bufToBase64Url(hexToBuf(publicKeyHex))
      },
      format: 'jwk'
    });

    return cryptoVerify(null, Buffer.from(message, 'utf8'), publicKey, Buffer.from(signatureHex, 'hex'));
  } catch (error) {
    return false;
  }
}
