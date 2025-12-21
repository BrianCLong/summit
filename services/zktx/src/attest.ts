export type Attestation = { service: string; ts: string; measurement: string };

export function attest(service = 'zktx') {
  return { service, ts: new Date().toISOString(), measurement: 'dev' };
}
