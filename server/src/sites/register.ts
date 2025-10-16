import { Pool } from 'pg';
import crypto from 'crypto';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function registerSite({
  name,
  region,
  residency,
  pubkey,
  bandwidth,
}: {
  name: string;
  region: string;
  residency: string;
  pubkey: string;
  bandwidth: 'low' | 'med' | 'high';
}) {
  const {
    rows: [s],
  } = await pg.query(
    `INSERT INTO sites(name,region,residency,trust_pubkey,bandwidth_class)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (name,region) DO UPDATE SET trust_pubkey=$4, bandwidth_class=$5
     RETURNING id, name, region, residency, bandwidth_class AS bandwidth`,
    [name, region, residency, pubkey, bandwidth],
  );
  return s;
}

export function verifySignature(
  pubkeyPem: string,
  bytes: Buffer,
  sigB64: string,
) {
  try {
    const v = crypto.createVerify('RSA-SHA256');
    v.update(bytes);
    v.end();
    return v.verify(pubkeyPem, Buffer.from(sigB64, 'base64'));
  } catch {
    return false;
  }
}
