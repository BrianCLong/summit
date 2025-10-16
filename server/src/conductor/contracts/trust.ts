import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export type TrustContract = {
  providerTenant: string;
  consumerTenant: string;
  scope: any;
  residency: string;
  expiresAt: string;
  signature: string;
};

export async function verifyTrustContract(tc: TrustContract) {
  if (new Date(tc.expiresAt) < new Date()) throw new Error('contract expired');
  // TODO: Verify signature against provider's registered key (PKI/cosign)
  return true;
}

export async function upsertTrustContract(tc: TrustContract) {
  await verifyTrustContract(tc);
  await pg.query(
    `INSERT INTO trust_contracts(id, provider, consumer, scope, residency, expires_at, signature)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     ON CONFLICT (provider, consumer, signature) DO NOTHING`,
    [
      tc.providerTenant,
      tc.consumerTenant,
      tc.scope,
      tc.residency,
      tc.expiresAt,
      tc.signature,
    ],
  );
}
