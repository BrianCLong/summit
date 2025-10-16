import crypto from 'crypto';
export async function buildRdsAuthToken(host: string, user: string) {
  // Placeholder: call AWS SDK RDS.Signer to create 15‑min token
  return `token-for-${user}@${host}`;
}
