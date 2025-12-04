import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import 'dotenv/config';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MIGRATIONS_DIR = path.resolve(__dirname, '../db/migrations/postgres');
export const TABLE_NAME = '_migrations';

export interface MigrationFile {
  name: string;
  timestamp: string;
  upPath: string;
  downPath?: string;
}

export interface AppliedMigration {
  id: number;
  name: string;
  applied_at: Date;
  hash: string;
}

export function getMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const files = fs.readdirSync(MIGRATIONS_DIR).sort();
  const migrations: Map<string, MigrationFile> = new Map();

  files.forEach((f) => {
    if (!f.endsWith('.sql')) return;
    const isDown = f.endsWith('.down.sql');
    const baseName = isDown ? f.replace('.down.sql', '') : f.replace('.sql', '');
    const timestamp = baseName.split('_')[0];

    if (!migrations.has(baseName)) {
      migrations.set(baseName, {
        name: baseName,
        timestamp,
        upPath: '',
      });
    }

    const migration = migrations.get(baseName)!;
    if (isDown) {
      migration.downPath = path.join(MIGRATIONS_DIR, f);
    } else {
      migration.upPath = path.join(MIGRATIONS_DIR, f);
    }
  });

  return Array.from(migrations.values())
    .filter(m => m.upPath !== '') // Ensure up migration exists
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClient() {
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set');
  }
  const client = new Client({ connectionString: connStr });
  await client.connect();
  return client;
}

export async function ensureMigrationTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      hash TEXT
    );
  `);
}

export async function getAppliedMigrations(client: Client): Promise<AppliedMigration[]> {
  const res = await client.query(`SELECT * FROM ${TABLE_NAME} ORDER BY id ASC`);
  return res.rows;
}

async function calculateHash(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf8');
  return createHash('md5').update(content).digest('hex');
}

export async function runUp(client: Client, file: MigrationFile, dryRun = false) {
  console.log(`Applying ${file.name}...${dryRun ? ' (DRY RUN)' : ''}`);
  const sql = fs.readFileSync(file.upPath, 'utf8');
  const hash = await calculateHash(file.upPath);

  try {
    await client.query('BEGIN');
    await client.query(sql);
    if (!dryRun) {
      await client.query(
        `INSERT INTO ${TABLE_NAME} (name, hash) VALUES ($1, $2)`,
        [file.name, hash]
      );
    }
    await client.query('COMMIT');
    console.log(`✅ Applied ${file.name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to apply ${file.name}:`, err);
    throw err;
  }
}

export async function runDown(client: Client, file: MigrationFile, dryRun = false) {
  if (!file.downPath) {
    console.warn(`⚠️  No down migration for ${file.name}, skipping rollback logic (just removing from table).`);
  }

  console.log(`Rolling back ${file.name}...${dryRun ? ' (DRY RUN)' : ''}`);

  try {
    await client.query('BEGIN');
    if (file.downPath) {
        const sql = fs.readFileSync(file.downPath, 'utf8');
        await client.query(sql);
    } else {
        console.warn(`⚠️  Executing virtual rollback for ${file.name} (only removing record)`);
    }

    if (!dryRun) {
      await client.query(`DELETE FROM ${TABLE_NAME} WHERE name = $1`, [file.name]);
    }
    await client.query('COMMIT');
    console.log(`✅ Rolled back ${file.name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to rollback ${file.name}:`, err);
    throw err;
  }
}

async function main() {
    // Only run if executed directly
    const currentFile = fileURLToPath(import.meta.url);
    if (process.argv[1] === currentFile) {
        const args = process.argv.slice(2);
        const command = args[0] || 'status';

        const client = await getClient();

        try {
            await ensureMigrationTable(client);
            const files = getMigrationFiles();
            const applied = await getAppliedMigrations(client);
            const appliedNames = new Set(applied.map(m => m.name));

            if (command === 'status') {
                console.log('Migration Status:');
                files.forEach(f => {
                    const isApplied = appliedNames.has(f.name);
                    const status = isApplied ? '✅ Applied' : '⬜ Pending';
                    const hasDown = f.downPath ? 'Has Down' : 'No Down';
                    console.log(`${f.name.padEnd(50)} | ${status} | ${hasDown}`);
                });
                const fileNames = new Set(files.map(f => f.name));
                applied.forEach(m => {
                    if (!fileNames.has(m.name)) {
                        console.warn(`⚠️  Orphaned migration record found: ${m.name}`);
                    }
                });
            } else if (command === 'up') {
                for (const file of files) {
                    if (!appliedNames.has(file.name)) {
                        await runUp(client, file);
                    }
                }
            } else if (command === 'down') {
                if (applied.length === 0) {
                    console.log('No migrations to rollback.');
                    return;
                }
                const lastApplied = applied[applied.length - 1];
                const file = files.find(f => f.name === lastApplied.name);
                if (!file) {
                   // If file is missing but recorded, we might just want to delete the record manually.
                   // But here let's throw.
                   throw new Error(`Could not find file for applied migration ${lastApplied.name}`);
                }
                await runDown(client, file);
            } else if (command === 'dry-run') {
                console.log('Starting Dry Run (Up -> Down -> Rollback)...');
                const pending = files.filter(f => !appliedNames.has(f.name));
                if (pending.length === 0) {
                    console.log('No pending migrations to dry-run.');
                }
                for (const file of pending) {
                    console.log(`Testing ${file.name}...`);
                    try {
                        await client.query('BEGIN');
                        console.log(`  Applying Up...`);
                        const upSql = fs.readFileSync(file.upPath, 'utf8');
                        await client.query(upSql);
                        if (file.downPath) {
                            console.log(`  Applying Down...`);
                            const downSql = fs.readFileSync(file.downPath, 'utf8');
                            await client.query(downSql);
                        }
                        await client.query('ROLLBACK');
                        console.log(`✅ ${file.name} passed dry-run.`);
                    } catch (error) {
                        await client.query('ROLLBACK');
                        console.error(`❌ ${file.name} FAILED dry-run:`, error);
                        process.exit(1);
                    }
                }
            } else {
                console.error(`Unknown command: ${command}`);
                process.exit(1);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        } finally {
            await client.end();
        }
    }
}

main();
