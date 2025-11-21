import { sign } from '@noble/ed25519';

export function base64UrlEncode(data: Uint8Array): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array(Buffer.from(normalized, 'base64'));
}

export async function signEd25519(
  message: Uint8Array,
  secretKey: Uint8Array,
): Promise<Uint8Array> {
  return sign(message, secretKey);
}
