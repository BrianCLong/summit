import { Pool } from 'pg';
import { AwsKmsProvider } from '../../services/crypto/index';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkParity() {
  const primaryKms = new AwsKmsProvider('alias/conductor/stage/mrk');
  const secondaryKms = new AwsKmsProvider('alias/conductor/stage/mrk'); // Assuming same alias, different regions configured in SDK

  const { rows } = await pool.query('SELECT id, edek, ctx FROM secrets_vault ORDER BY random() LIMIT 10');

  for (const row of rows) {
    console.log(`Checking secret ${row.id}...`);
    try {
      const dekPrimary = await primaryKms.decrypt(row.edek, row.ctx);
      console.log(`  - Primary region decrypt OK`);
      const dekSecondary = await secondaryKms.decrypt(row.edek, row.ctx);
      console.log(`  - Secondary region decrypt OK`);

      if (Buffer.compare(dekPrimary, dekSecondary) !== 0) {
        console.error(`  - MISMATCH! DEKs do not match for secret ${row.id}`);
      } else {
        console.log(`  - DEK Parity OK`);
      }
    } catch (error) {
      console.error(`  - FAILED to decrypt secret ${row.id}:`, error);
    }
  }
  await pool.end();
}

checkParity().catch(console.error);
