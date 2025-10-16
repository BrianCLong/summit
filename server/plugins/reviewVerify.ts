import * as crypto from 'crypto';
export function verify(sigB64: string, body: string, pubPem: string) {
  const v = crypto.createVerify('RSA-SHA256');
  v.update(body);
  v.end();
  return v.verify(pubPem, Buffer.from(sigB64, 'base64'));
}
