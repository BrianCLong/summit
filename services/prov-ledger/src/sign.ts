import crypto from 'crypto';

export type Key = { kid: string; privPem: string; pubPem: string };

const DETACHED_HEADER = {
  alg: 'RS256',
  b64: false,
  crit: ['b64'],
} as const;

export function signDetachedJws(payloadB64: string, key: Key) {
  if (!payloadB64) throw new Error('empty_payload');
  if (!key?.kid || !key.privPem) throw new Error('missing_key');

  const header = Buffer.from(
    JSON.stringify({ ...DETACHED_HEADER, kid: key.kid }),
  ).toString('base64url');

  const signingInput = `${header}.${payloadB64}`; // detached payload
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign(key.privPem).toString('base64url');
  return `${header}..${sig}`;
}

function assertDetachedHeader(header: any) {
  if (!header || typeof header !== 'object') throw new Error('bad_header');
  if (header.alg !== 'RS256') throw new Error('unsupported_alg');
  if (header.b64 !== false) throw new Error('detached_required');
  if (!Array.isArray(header.crit) || !header.crit.includes('b64')) {
    throw new Error('missing_crit');
  }
  if (typeof header.kid !== 'string' || header.kid.trim().length === 0) {
    throw new Error('missing_kid');
  }
}

export function verifyDetachedJws(payloadB64: string, jws: string, pubPem: string) {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('malformed_jws');
  const [headerB64, payloadPlaceholder, sigB64] = parts;
  if (payloadPlaceholder !== '') throw new Error('expected_detached_payload');
  if (!sigB64) throw new Error('missing_signature');

  let headerJson: any;
  try {
    headerJson = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('bad_header');
  }
  assertDetachedHeader(headerJson);

  const signingInput = `${headerB64}.${payloadB64}`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signingInput);
  const signature = Buffer.from(sigB64, 'base64url');
  if (!signature.length) throw new Error('missing_signature');
  return verifier.verify(pubPem, signature);
}
