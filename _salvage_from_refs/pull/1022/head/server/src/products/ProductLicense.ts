import crypto from 'crypto';

export type License = {
  productId: string;
  tenantId: string;
  roomId: string;
  epsilonCap: number;
  expiresAt: number;
  scopes: string[];
  jti: string;
};

export function issueLicense(l: Omit<License, 'jti'>, key: crypto.KeyObject) {
  const jti = crypto.randomUUID();
  const payload: License = { ...l, jti };
  const sig = crypto.createSign('RSA-SHA256').update(JSON.stringify(payload)).sign(key).toString('base64');
  return { token: Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + sig, payload };
}

export function verifyLicense(token: string, pub: crypto.KeyObject): License {
  const [b64, sig] = token.split('.');
  const payload = JSON.parse(Buffer.from(b64, 'base64').toString());
  const ok = crypto.createVerify('RSA-SHA256').update(JSON.stringify(payload)).verify(pub, Buffer.from(sig, 'base64'));
  if (!ok) throw new Error('license_invalid');
  if (Date.now() > payload.expiresAt) throw new Error('license_expired');
  return payload;
}
