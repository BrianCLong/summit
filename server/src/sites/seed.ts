import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const rows = [
    {
      name: 'edge-paris',
      region: 'eu-west-1',
      residency: 'EU',
      pubkey: process.env.SEED_PARIS_PUBKEY!,
      bandwidth: 'low',
    },
    {
      name: 'edge-virginia',
      region: 'us-east-1',
      residency: 'US',
      pubkey: process.env.SEED_VIRGINIA_PUBKEY!,
      bandwidth: 'med',
    },
  ];
  for (const r of rows) {
    if (!r.pubkey) throw new Error(`Missing pubkey for ${r.name}`);
    await pg.query(
      `INSERT INTO sites(name,region,residency,trust_pubkey,bandwidth_class)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (name,region) DO UPDATE SET trust_pubkey=EXCLUDED.trust_pubkey, residency=EXCLUDED.residency, bandwidth_class=EXCLUDED.bandwidth_class`,
      [r.name, r.region, r.residency, r.pubkey, r.bandwidth],
    );
  }
  console.log('seeded sites:', rows.map((r) => r.name).join(', '));
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
