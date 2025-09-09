// Re-encrypt selected columns with new DEK; idempotent, chunked
import { enc, dec } from '../server/crypto/kms.js';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function rotateDEK() {
  console.log('Starting DEK rotation...');
  
  // Example: Re-encrypt user emails
  const client = await pool.connect();
  try {
    const batchSize = 100;
    let offset = 0;
    let processed = 0;
    
    while (true) {
      const result = await client.query(
        'SELECT id, email_encrypted FROM users WHERE email_encrypted IS NOT NULL LIMIT $1 OFFSET $2',
        [batchSize, offset]
      );
      
      if (result.rows.length === 0) break;
      
      for (const row of result.rows) {
        try {
          // Decrypt with old key and re-encrypt with new key
          const decrypted = await dec(row.email_encrypted);
          const newEncrypted = await enc(decrypted);
          
          await client.query(
            'UPDATE users SET email_encrypted = $1 WHERE id = $2',
            [newEncrypted, row.id]
          );
          
          processed++;
        } catch (error) {
          console.error(`Failed to rotate DEK for user ${row.id}:`, error);
        }
      }
      
      offset += batchSize;
      console.log(`Processed ${processed} records...`);
    }
    
    console.log(`DEK rotation completed. Total processed: ${processed}`);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  rotateDEK().catch(console.error);
}