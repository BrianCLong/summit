import crypto from 'crypto';

export type Key = { kid: string; privPem: string; pubPem: string };
export type DetachedJwsHeader = {
  alg: string;
  kid: string;
  b64: boolean;
  crit: string[];
};

const BASE64_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

function parseHeader(headerB64: string): DetachedJwsHeader {
  const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
  const parsed = JSON.parse(headerJson) as DetachedJwsHeader;
  if (parsed.alg !== 'RS256' || parsed.b64 !== false || !Array.isArray(parsed.crit) || !parsed.crit.includes('b64')) {
    throw new Error('invalid_header');
  }
  if (!parsed.kid) throw new Error('missing_kid');
  return parsed;
}

function validatePayload(payloadB64: string) {
  if (!payloadB64 || !BASE64_PATTERN.test(payloadB64)) {
    throw new Error('invalid_payload');
  }
}

export function signDetachedJws(payloadB64: string, key: Key) {
  validatePayload(payloadB64);
  if (!key?.privPem || !key?.kid) throw new Error('invalid_key');
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: key.kid, b64: false, crit: ['b64'] })
  ).toString('base64url');
  const signingInput = `${header}.` + payloadB64;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const sig = signer.sign(key.privPem).toString('base64url');
  return `${header}..${sig}`;
}

export function verifyDetachedJws(payloadB64: string, jws: string, pubPem: string) {
  validatePayload(payloadB64);
  const [headerB64, detachedMark, sigB64] = jws.split('.');
  if (!headerB64 || detachedMark !== '' || !sigB64) throw new Error('malformed_jws');
  parseHeader(headerB64);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.` + payloadB64);
  verifier.end();
  return verifier.verify(pubPem, Buffer.from(sigB64, 'base64url'));
}
