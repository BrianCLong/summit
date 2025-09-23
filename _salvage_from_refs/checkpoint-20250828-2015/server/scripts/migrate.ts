import { Client } from "pg";
import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIR = path.resolve(__dirname, "../../db/migrations"); // repoRoot/db/migrations
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/intelgraph";

type Cmd = "up" | "status" | "down";
const cmd: Cmd = (process.argv[2] as Cmd) || "up";
const downCount = Number(process.argv[3] || 1);

async function ensureTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function readMigrations(): string[] {
  if (!fs.existsSync(DIR)) {
    throw new Error(`Migrations directory not found: ${DIR}`);
  }
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();
}

async function appliedSet(client: Client): Promise<Set<string>> {
  const { rows } = await client.query(
    `SELECT filename FROM schema_migrations ORDER BY filename`
  );
  return new Set(rows.map((r) => r.filename as string));
}

async function applyFile(client: Client, filename: string) {
  const full = path.join(DIR, filename);
  const sql = fs.readFileSync(full, "utf8");
  // Run the file atomically
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
      [filename]
    );
    await client.query("COMMIT");
    console.log(`✓ applied ${filename}`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`✗ failed ${filename}`);
    throw e;
  }
}

async function status(client: Client) {
  const files = readMigrations();
  const applied = await appliedSet(client);
  const rows = files.map((f) => ({
    file: f,
    applied: applied.has(f) ? "yes" : "no",
  }));
  console.table(rows);
}

async function down(client: Client, count: number) {
  // Supports reversible migrations named with a paired ".down.sql" file.
  // Example: 20250828_org_identity.sql  <->  20250828_org_identity.down.sql
  const { rows } = await client.query(
    `SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT $1`,
    [count]
  );
  if (!rows.length) {
    console.log("No migrations to roll back.");
    return;
  }
  for (const r of rows) {
    const upFile = r.filename as string;
    const base = upFile.replace(/\.sql$/, "");
    const downFile = `${base}.down.sql`;
    const fullDown = path.join(DIR, downFile);
    if (!fs.existsSync(fullDown)) {
      throw new Error(
        `No down file for ${upFile}. Expected: ${downFile}. Aborting.`
      );
    }
    const sql = fs.readFileSync(fullDown, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(`DELETE FROM schema_migrations WHERE filename=$1`, [
        upFile,
      ]);
      await client.query("COMMIT");
      console.log(`↩ rolled back ${upFile} via ${downFile}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
}

async function connectWithRetry(url: string, attempts = 30, ms = 1000) {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      const c = new Client({ connectionString: url, ssl: false });
      await c.connect();
      return c;
    } catch (e) {
      lastErr = e;
      console.log(`DB not ready (${i}/${attempts})… retrying in ${ms}ms`);
      await new Promise(r => setTimeout(r, ms));
    }
  }
  throw lastErr;
}

async function main() {
  const client = await connectWithRetry(DATABASE_URL);
  try {
    await ensureTable(client);

    if (cmd === "status") {
      await status(client);
      return;
    }

    if (cmd === "down") {
      await down(client, downCount);
      return;
    }

    // default: up
    const files = readMigrations();
    const applied = await appliedSet(client);
    const pending = files.filter((f) => !applied.has(f));
    if (!pending.length) {
      console.log("No pending migrations.");
      return;
    }
    for (const f of pending) {
      await applyFile(client, f);
    }
    console.log("All pending migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
