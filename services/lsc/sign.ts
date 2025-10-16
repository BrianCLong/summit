import crypto from 'crypto';
export function signLSC(doc: any, privPem: string) {
  const data = Buffer.from(JSON.stringify(doc));
  const sig = crypto.sign('sha256', data, privPem).toString('base64');
  return { doc, sig };
}
