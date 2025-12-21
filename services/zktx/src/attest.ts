import crypto from 'crypto';

export type Attestation = { service: string; ts: string; measurement: string };

export function attest(service = 'zktx', fingerprint?: string): Attestation {
  const ts = new Date().toISOString();
  const measurement =
    fingerprint || crypto.createHash('sha256').update(`${service}:${ts}:${process.pid}`).digest('hex');
  return { service, ts, measurement };
}
