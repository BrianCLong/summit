"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = migrate;
const pg_1 = require("pg");
async function migrate(pool) {
    const pg = pool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    await pg.query(`
    CREATE TABLE IF NOT EXISTS remote_tickets (
      ticket_id text PRIMARY KEY,
      site_id uuid NOT NULL REFERENCES sites(id),
      run_id uuid NOT NULL,
      step_id text NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      result jsonb,
      created_at timestamptz DEFAULT now(),
      completed_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS idx_remote_tickets_site ON remote_tickets(site_id);
  `);
}
