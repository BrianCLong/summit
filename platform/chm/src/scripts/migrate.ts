import { loadConfig } from '../config.js';
import { createPool, initSchema } from '../db.js';
import { defaultTaxonomy } from '../taxonomy.js';

const run = async () => {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  await initSchema(pool);
  await Promise.all(
    defaultTaxonomy.map((level) =>
      pool.query(
        `INSERT INTO taxonomy_levels (code, name, max_duration_days)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [level.code, level.name, level.maxDurationDays]
      )
    )
  );
  await pool.end();
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed', err);
  process.exit(1);
});
