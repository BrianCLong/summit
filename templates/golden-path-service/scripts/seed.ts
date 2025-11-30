import { Client } from 'pg';

const connectionString = process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/golden_path';

const seed = async () => {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await client.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await client.query(
    `INSERT INTO payments (id, tenant, amount, status) VALUES
      ('11111111-1111-1111-1111-111111111111', 'tenant-a', 100.00, 'pending'),
      ('22222222-2222-2222-2222-222222222222', 'tenant-b', 250.00, 'pending')
     ON CONFLICT (id) DO NOTHING;`
  );
  await client.end();
};

seed()
  .then(() => {
    console.log('Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
